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
