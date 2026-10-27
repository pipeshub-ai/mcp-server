import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import * as z from "zod";
import { tool$pipeshubGetRecordContent } from "../src/mcp-server/tools/pipeshubGetRecordContent.js";

// This tool has three modes behind one entry point: read a document, walk the
// knowledge graph, and resolve an identifier to a record. Each has its own
// required argument and its own failure path, and picking the wrong branch
// silently sends the request to the wrong endpoint.

const REC = "rec-1";

function client(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    urls.push((input as Request).url);
    return Response.json(body, { status });
  };
  return {
    urls,
    core: new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    }),
  };
}

const run = (core: PipeshubCore, args: Record<string, unknown>) =>
  tool$pipeshubGetRecordContent.tool(
    core,
    args as never,
    { signal: new AbortController().signal } as never,
  );

const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");

describe("content mode", () => {
  test("hands over the document text, not the wrapper it arrived in", async () => {
    // The endpoint answers `{ content: "..." }`. Passing that through would
    // give the model a JSON object with escaped newlines to read instead of
    // the document.
    const { core } = client({ content: "line one\nline two" });

    const out = await run(core, { mode: "content", recordId: REC });

    expect(out.content).toEqual([{ type: "text", text: "line one\nline two" }]);
  });

  test("a document with no content is empty text rather than a crash", async () => {
    const { core } = client({});

    const out = await run(core, { mode: "content", recordId: REC });

    expect(out.content).toEqual([{ type: "text", text: "" }]);
  });

  test("a missing recordId says which argument is needed, without calling out", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return Response.json({});
    };
    const core = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });

    const out = await run(core, { mode: "content" });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("recordId");
    expect(called).toBe(false);
  });

  test("a failed fetch reports the status instead of an empty document", async () => {
    // An empty document is a plausible answer, so a failure shaped like one
    // tells the model the document is blank when it simply could not be read.
    const { core } = client({ message: "no access" }, 403);

    const out = await run(core, { mode: "content", recordId: REC });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("403");
    expect(textOf(out)).toContain("no access");
  });
});

describe("lookup mode", () => {
  test("accepts a single identifier as well as a list", async () => {
    const { core } = client({ text: "found it" });

    const one = await run(core, { mode: "lookup", identifiers: "PROJ-1" });
    const many = await run(core, { mode: "lookup", identifiers: ["PROJ-1", "PROJ-2"] });

    expect(one.isError).toBeUndefined();
    expect(many.isError).toBeUndefined();
  });

  test("no identifiers at all says so rather than looking up nothing", async () => {
    const { core, urls } = client({ text: "x" });

    const out = await run(core, { mode: "lookup", identifiers: [] });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("identifiers");
    expect(urls).toHaveLength(0);
  });

  test("a failed lookup reports the status", async () => {
    const { core } = client({ message: "gone" }, 404);

    const out = await run(core, { mode: "lookup", identifiers: "PROJ-1" });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("404");
  });
});

describe("navigate mode", () => {
  test("returns what the server rendered", async () => {
    const { core } = client({ text: "a folder listing" });

    const out = await run(core, { mode: "navigate", nodeId: "n-1" });

    expect(out.isError).toBeUndefined();
    expect(textOf(out)).toContain("a folder listing");
  });

  test("a failed navigation reports the status", async () => {
    const { core } = client({ message: "nope" }, 500);

    const out = await run(core, { mode: "navigate", nodeId: "n-1" });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("500");
  });

  test("each mode reaches a different endpoint", async () => {
    // One entry point, three destinations. If two modes ever resolved to the
    // same URL the mistake would look like a server bug, not a routing one.
    const seen: string[] = [];
    for (const args of [
      { mode: "content", recordId: REC },
      { mode: "lookup", identifiers: "PROJ-1" },
      { mode: "navigate", nodeId: "n-1" },
    ]) {
      const { core, urls } = client({ content: "", text: "" });
      await run(core, args);
      seen.push(new URL(urls[0]!).pathname);
    }
    expect(new Set(seen).size).toBe(3);
  });
});

// A long record used to come back whole: a pull request with its diffs ran to
// hundreds of thousands of characters, past any client's tool-output limit,
// and a Slack reply came back without the rest of its thread.
describe("reading part of a long record", () => {
  const params = (url: string) => new URL(url).searchParams;

  test("asks for a bounded read by default", () => {
    const parsed = z.object(tool$pipeshubGetRecordContent.args).parse({
      recordId: REC,
    });
    // About 10k tokens: inside common clients' tool-output limits.
    expect((parsed as { maxChars?: number }).maxChars).toBe(40_000);
  });

  test("sends the budget, the question and the offset", async () => {
    const { core, urls } = client({ content: "x" });

    await run(core, {
      mode: "content", recordId: REC, maxChars: 20_000, query: "rollback", startBlock: 97,
    });

    const sent = params(urls[0]!);
    expect(new URL(urls[0]!).pathname).toBe(`/api/v1/connectors/record/${REC}/content`);
    expect(sent.get("maxChars")).toBe("20000");
    expect(sent.get("query")).toBe("rollback");
    expect(sent.get("startBlock")).toBe("97");
    expect(sent.get("mode")).toBeNull();
  });

  test("a cut-short read names the exact call that reads on", async () => {
    const { core } = client({
      content: "<record>…blocks 0–96…</record>",
      mode: "record", order: "in_order", totalBlocks: 3000, shownBlocks: [[0, 96]],
      complete: false, nextStartBlock: 97, chars: 39_202, maxChars: 40_000,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text.startsWith("<record>…blocks 0–96…</record>")).toBe(true);
    expect(text).toContain("Read: blocks 0–96 of 3000.");
    expect(text).toContain(
      `Next: pipeshub_get_record_content {"mode":"content","recordId":"${REC}","startBlock":97}`,
    );
  });

  test("a read chosen by the question says which parts it skipped", async () => {
    const { core } = client({
      content: "selected",
      mode: "record", order: "relevance", totalBlocks: 3000,
      shownBlocks: [[0, 39], [2473, 2527]], complete: false, nextStartBlock: 40,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC, query: "q" }));

    expect(text).toContain("most relevant to your query (0–39, 2473–2527 of 3000)");
    expect(text).toContain('"startBlock":40}');
    expect(text).toContain(
      `To read it in order instead: pipeshub_get_record_content {"mode":"content","recordId":"${REC}","startBlock":0}`,
    );
  });

  test("a record read to the end says so and offers no next call", async () => {
    const { core } = client({
      content: "all of it", mode: "record", order: "in_order", totalBlocks: 5,
      shownBlocks: [[0, 4]], complete: true, nextStartBlock: null,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toBe("all of it\n\nRead: the whole record (5 blocks).");
  });
});

describe("a block too large for any budget", () => {
  test("a record read to its end does not claim it was read whole", async () => {
    const { core } = client({
      content: "cut text", mode: "record", order: "in_order", totalBlocks: 1,
      shownBlocks: [], complete: true, truncatedBy: "clipped", givenUpBlock: 0,
      nextStartBlock: null,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toContain("Read: to the end of the record (1 block).");
    expect(text).toContain("Lost: block 0 is larger than any maxChars");
    expect(text).not.toContain("whole record");
    expect(text).not.toContain("Next:");
  });

  test("a block given up with more of the record to come is named on that read", async () => {
    const { core } = client({
      content: "cut text", mode: "record", order: "in_order", totalBlocks: 3,
      shownBlocks: [], complete: false, truncatedBy: "clipped", givenUpBlock: 0,
      nextStartBlock: 1,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toContain("Lost: block 0 is larger than any maxChars");
    expect(text).toContain('"startBlock":1}');
  });

  test("a later read that reaches the end does not call it the whole record", async () => {
    const { core } = client({
      content: "the rest", mode: "record", order: "in_order", totalBlocks: 3,
      startBlock: 1, shownBlocks: [[1, 2]], complete: true, truncatedBy: null,
      givenUpBlock: null, nextStartBlock: null,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC, startBlock: 1 }));

    expect(text).toContain("Read: to the end of the record (3 blocks; blocks before 1 were in earlier reads).");
    expect(text).not.toContain("whole record");
  });

  test("a reply given up mid-thread is named on that page", async () => {
    const { core } = client({
      content: "replies", mode: "thread", threadRecordCount: 2, startRecord: 0,
      complete: false, nextStartRecord: 1, nextStartBlock: 0,
      records: [{ recordId: "t-0", complete: false, truncatedBy: "clipped", givenUpBlock: 0, nextStartBlock: null }],
      givenUpBlocks: [{ recordId: "t-0", block: 0 }],
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC }));

    expect(text).toContain("Lost: block 0 of record t-0 is larger than any maxChars");
    expect(text).toContain('"startRecord":1,"startBlock":0}');
  });

  test("a thread read that resumed inside its first record names those earlier blocks", async () => {
    const { core } = client({
      content: "rest of the parent", mode: "thread", threadRecordCount: 5, startRecord: 0,
      startBlock: 4, complete: true, nextStartRecord: null, givenUpBlocks: [],
      records: [{ recordId: "t-0", complete: true, truncatedBy: null, givenUpBlock: null, nextStartBlock: null }],
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC, startRecord: 0, startBlock: 4 }));

    expect(text).toContain("Read: to the end of the thread (records 1–5 of 5; blocks before 4 of record 1 were in earlier reads).");
    expect(text).not.toContain("earlier ones were in earlier reads");
  });

  test("a thread's last page does not call it the whole thread", async () => {
    const { core } = client({
      content: "last reply", mode: "thread", threadRecordCount: 2, startRecord: 1,
      startBlock: 0, complete: true, nextStartRecord: null, givenUpBlocks: [],
      records: [{ recordId: "t-1", complete: true, truncatedBy: null, givenUpBlock: null, nextStartBlock: null }],
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC, startRecord: 1 }));

    expect(text).toContain("Read: to the end of the thread (records 2–2 of 2; earlier ones were in earlier reads).");
    expect(text).not.toContain("whole thread");
  });
});

describe("a record with nothing to read", () => {
  test("is not reported as read in full and empty", async () => {
    // The budgeted route answers a record with no stored content with its
    // note and `complete: true`, but no block count.
    const { core } = client({
      content: "Record ID: r-1\n\nNot indexed: (status: QUEUED)",
      mode: "record", recordId: "r-1", complete: true, nextStartBlock: null,
      chars: 40, maxChars: 40_000,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toBe("Record ID: r-1\n\nNot indexed: (status: QUEUED)");
    expect(text).not.toContain("Read:");
  });
});

describe("thread mode", () => {
  test("asks for the thread the record belongs to", async () => {
    const { core, urls } = client({ content: "x", mode: "thread", complete: true });

    await run(core, {
      mode: "thread", recordId: REC, maxChars: 40_000, startRecord: 3, startBlock: 7,
    });

    const sent = new URL(urls[0]!).searchParams;
    expect(sent.get("mode")).toBe("thread");
    expect(sent.get("startRecord")).toBe("3");
    expect(sent.get("startBlock")).toBe("7");
    expect(sent.get("maxChars")).toBe("40000");
  });

  test("a long thread names the call that reads on, cursor block included", async () => {
    // A reply cut short keeps the cursor: the next read resumes inside it.
    const { core } = client({
      content: "parent and first replies",
      mode: "thread", threadRecordCount: 12, startRecord: 0, complete: false,
      nextStartRecord: 3, nextStartBlock: 7,
      records: [
        { recordId: "t-0", complete: true, nextStartBlock: null },
        { recordId: "t-1", complete: true, nextStartBlock: null },
        { recordId: "t-2", complete: true, nextStartBlock: null },
        { recordId: "t-3", complete: false, nextStartBlock: 7 },
      ],
      unreadableRecordIds: ["t-9"],
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC }));

    expect(text).toContain("Read: thread records 1–4 of 12.");
    expect(text).toContain(
      `Next: pipeshub_get_record_content {"mode":"thread","recordId":"${REC}","startRecord":3,"startBlock":7}`,
    );
    expect(text).toContain("could not be loaded");
    expect(text).toContain("t-9");
  });

  test("a whole thread says so", async () => {
    const { core } = client({
      content: "every reply", mode: "thread", threadRecordCount: 3, startRecord: 0,
      complete: true, nextStartRecord: null, records: [],
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC }));

    expect(text).toContain("Read: the whole thread (3 records).");
    expect(text).not.toContain("Next:");
  });

  test("an older server's single record is not passed off as the thread", async () => {
    const { core } = client({ content: "just one burst" });

    const text = textOf(await run(core, { mode: "thread", recordId: REC }));

    expect(text).toContain("cannot read a whole Slack thread");
    expect(text).toContain("just one burst");
  });

  test("a record outside any thread reports why", async () => {
    const { core } = client(
      { detail: "This record is not part of a Slack thread." }, 422,
    );

    const out = await run(core, { mode: "thread", recordId: REC });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("not part of a Slack thread");
  });

  test("a missing recordId names the mode", async () => {
    const { core, urls } = client({});

    const out = await run(core, { mode: "thread" });

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain('"thread"');
    expect(urls).toHaveLength(0);
  });

  test("the description routes thread questions to it", () => {
    const flat = tool$pipeshubGetRecordContent.description.replace(/\s+/g, " ");
    expect(flat).toContain('mode:"thread"');
    expect(flat).toMatch(/Reply Count: N[^.]*\. `mode:"thread"`/);
  });
});

describe("a Slack record whose messages have replies", () => {
  // The replies are separate records. Agents read "Read: the whole record"
  // over the parent message, trusted a header that said "Has Replies: False",
  // and never read the thread.
  const threadCall =
    `pipeshub_get_record_content {"mode":"thread","recordId":"${REC}"}`;

  test("a single message with replies names the thread read", async () => {
    const { core } = client({
      content: "- **A**: who owns this?\n\nReply Count: 21",
      mode: "record", totalBlocks: 1, shownBlocks: [[0, 0]], complete: true,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toBe(
      "- **A**: who owns this?\n\nReply Count: 21\n\n"
        + "Read: the whole record (1 block).\n"
        + "Replies: A message here has 21 thread replies, kept as separate "
        + `records. Read the whole thread: ${threadCall}`,
    );
  });

  test("a burst with two parents counts both", async () => {
    const { core } = client({
      content: "- a\n\nReply Count: 6\n\n- b\n\n- c\n\nReply Count: 3",
      mode: "record", totalBlocks: 3, shownBlocks: [[0, 2]], complete: true,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toContain("Replies: 2 messages here have 9 thread replies");
  });

  test("a partial read still points to the thread", async () => {
    const { core } = client({
      content: "- root\n\nReply Count: 1\n\n- r1",
      mode: "record", order: "in_order", totalBlocks: 40,
      shownBlocks: [[0, 1]], complete: false, nextStartBlock: 2,
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toContain("Replies: A message here has 1 thread reply,");
    expect(text).toContain(`Next: pipeshub_get_record_content`);
  });

  test("an older server's whole record gets the line too", async () => {
    const { core } = client({ content: "- root\n\nReply Count: 4" });

    const text = textOf(await run(core, { mode: "content", recordId: REC }));

    expect(text).toContain(`Read the whole thread: ${threadCall}`);
  });

  test("a message without replies, or one quoting the phrase, gets none", async () => {
    for (const content of ["- quiet", "- it said Reply Count: 5 yesterday", "- x\n\nReply Count: 0"]) {
      const { core } = client({
        content, mode: "record", totalBlocks: 1, shownBlocks: [[0, 0]], complete: true,
      });

      const text = textOf(await run(core, { mode: "content", recordId: REC }));

      expect(text).not.toContain("Replies:");
    }
  });

  test("a thread read does not point to itself", async () => {
    const { core } = client({
      content: "- root\n\nReply Count: 2\n\n- r1\n\n- r2",
      mode: "thread", threadRecordCount: 1, startRecord: 0,
      records: [{ recordId: REC, complete: true }], complete: true,
      nextStartRecord: null,
    });

    const text = textOf(await run(core, { mode: "thread", recordId: REC }));

    expect(text).not.toContain("Replies:");
  });
});

// A web-fetch tool has a small model read a page and pass on only what answers
// the agent's prompt. `extract` asks PipesHub's reader model to do the same
// for one record, so the agent's own model reads the passages, not the record.
describe("an extract of one record", () => {
  const params = (url: string) => new URL(url).searchParams;
  const EXTRACT = {
    content: "FY2025 Annual Report\n\n65 sponsors",
    mode: "record", order: "extract", totalBlocks: 518, complete: false, nextStartBlock: null, chars: 33,
    extract: {
      model: "small-model", provider: "azureOpenAI", nothingRelevant: false,
      sourceChars: 68_455, sourceComplete: true, inputTokens: 15_926, outputTokens: 262,
    },
  };

  test("is asked for only with a question and no startBlock", async () => {
    const { core, urls } = client({ content: "x" });

    await run(core, { mode: "content", recordId: REC, query: "how many sponsors", extract: true });
    await run(core, { mode: "content", recordId: REC, extract: true });
    await run(core, { mode: "content", recordId: REC, query: "q", startBlock: 4, extract: true });
    await run(core, { mode: "thread", recordId: REC, query: "q", extract: true });

    expect(params(urls[0]!).get("extract")).toBe("true");
    expect(params(urls[0]!).get("query")).toBe("how many sponsors");
    for (const url of urls.slice(1)) expect(params(url).get("extract")).toBeNull();
  });

  test("returns the passages, says what they came from, and names the full read", async () => {
    const { core } = client(EXTRACT);

    const text = textOf(await run(core, {
      mode: "content", recordId: REC, query: "how many sponsors", extract: true,
    }));

    expect(text.startsWith("FY2025 Annual Report\n\n65 sponsors")).toBe(true);
    expect(text).toContain("passages copied out for your query by PipesHub's reader model from the whole record (68455 characters)");
    expect(text).toContain("the rest of the record is not shown");
    expect(text).toContain("The reader may add a note in square brackets saying where a passage sits; such a note is not a quote.");
    expect(text).toContain("Reader: small-model, 15926 tokens in, 262 out.");
    expect(text).toContain(
      `To read the record itself: pipeshub_get_record_content {"mode":"content","recordId":"${REC}","startBlock":0}`,
    );
  });

  test("says when the reader saw only the most relevant parts of a long record", async () => {
    const { core } = client({ ...EXTRACT, extract: { ...EXTRACT.extract, sourceComplete: false } });

    const text = textOf(await run(core, { mode: "content", recordId: REC, query: "q", extract: true }));

    expect(text).toContain("from the parts of the record most relevant to your query");
  });

  test("a reader that found nothing says so, not as text from the record", async () => {
    const { core } = client({
      ...EXTRACT,
      content: "NOTHING RELEVANT",
      extract: { ...EXTRACT.extract, nothingRelevant: true },
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC, query: "q", extract: true }));

    expect(text).not.toContain("NOTHING RELEVANT");
    expect(text).not.toContain("passages copied out");
    expect(text).toContain("found nothing in the whole record that answers your query");
    expect(text).toContain(`"startBlock":0`);
  });

  test("a cut reply and lines not in the record are flagged", async () => {
    const { core } = client({
      ...EXTRACT,
      extract: { ...EXTRACT.extract, truncated: true, unverifiedLines: 2 },
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC, query: "q", extract: true }));

    expect(text).toContain("The reader's reply was cut to fit");
    expect(text).toContain("2 line(s) above are not in the record word for word");
  });

  test("an extract waits longer than a read, and a 504 is not retried", async () => {
    const saved = process.env["PIPESHUB_MCP_TIMEOUT_MS"];
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "100";
    try {
      const sent: string[] = [];
      let reply: () => Response = () => Response.json({ content: "x" });
      const core = new PipeshubCore({
        serverURL: "http://pipeshub.test/api/v1",
        security: { bearerAuth: "t" },
        httpClient: new HTTPClient({
          fetcher: async (input: RequestInfo | URL) => {
            const req = input as Request;
            sent.push(req.url);
            expect(req.headers.get("x-pipeshub-timeout-ms")).toBeNull();
            // Like fetch, give up when the transport's deadline aborts the request.
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 300);
              req.signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(req.signal.reason);
              }, { once: true });
            });
            return reply();
          },
        }),
      });

      const slowExtract = await run(core, { mode: "content", recordId: REC, query: "q", extract: true });
      const slowRead = await run(core, { mode: "content", recordId: REC, query: "q" });
      expect(textOf(slowExtract)).toBe("x");
      expect((slowRead as { isError?: boolean }).isError).toBe(true);

      sent.length = 0;
      reply = () => new Response("gateway timeout", { status: 504 });
      await run(core, { mode: "content", recordId: REC, query: "q", extract: true });
      expect(sent).toHaveLength(1);
    } finally {
      if (saved === undefined) delete process.env["PIPESHUB_MCP_TIMEOUT_MS"];
      else process.env["PIPESHUB_MCP_TIMEOUT_MS"] = saved;
    }
  });

  test("a reader that could not be reached leaves a plain read that says so", async () => {
    const { core } = client({
      content: "<record>65 sponsors</record>",
      mode: "record", order: "in_order", totalBlocks: 1, shownBlocks: [[0, 0]],
      complete: true, nextStartBlock: null, chars: 28, maxChars: 40_000,
      extract: { error: "TimeoutError" },
    });

    const text = textOf(await run(core, { mode: "content", recordId: REC, query: "q", extract: true }));

    expect(text.startsWith("PipesHub's reader model could not be reached, so this is a plain read")).toBe(true);
    expect(text).toContain("<record>65 sponsors</record>");
    expect(text).toContain("Read: the whole record (1 block).");
  });
});
