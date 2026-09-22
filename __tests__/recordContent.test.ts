import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
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
