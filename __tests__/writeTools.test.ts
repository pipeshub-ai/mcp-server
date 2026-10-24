import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubConnectSource } from "../src/mcp-server/tools/pipeshubConnectSource.js";
import { tool$pipeshubCreateCollection } from "../src/mcp-server/tools/pipeshubCreateCollection.js";
import { tool$pipeshubIndexingStatus } from "../src/mcp-server/tools/pipeshubIndexingStatus.js";
import { tool$pipeshubUpload } from "../src/mcp-server/tools/pipeshubUpload.js";

// The write tools turn an empty workspace into a searchable one. What can go
// wrong quietly: an upload whose per-file failures arrive in the SSE stream
// and are dropped, a status that says "done" while records are still queued,
// and a link that loses the connector on a redirect.

const KB = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
const ctx = () => ({ signal: new AbortController().signal }) as never;
const textOf = (r: { content: Array<{ text?: string }> }) => r.content.map((c) => c.text ?? "").join("");
const jsonOf = (r: { content: Array<{ text?: string }> }) => JSON.parse(textOf(r));

type Seen = { method: string; path: string; search: string; body: unknown; contentType: string | null };

function client(answer: (req: Request, seen: Seen) => Response | Promise<Response>) {
  const calls: Seen[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const req = input as Request;
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type");
    const body = req.method === "GET"
      ? null
      : contentType?.startsWith("multipart/")
      ? await req.formData()
      : await req.text();
    const seen = { method: req.method, path: url.pathname, search: url.search, body, contentType };
    calls.push(seen);
    return answer(req, seen);
  };
  const core = new PipeshubCore({
    serverURL: "https://pipeshub.test/api/v1",
    security: { bearerAuth: "test" },
    httpClient: new HTTPClient({ fetcher }),
  });
  return { core, calls };
}

const sse = (frames: Array<[string, unknown]>) =>
  new Response(
    ": connected\n\n" + frames.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

describe("pipeshub_create_collection", () => {
  test("posts the name and returns the new id with a link to it", async () => {
    const { core, calls } = client(() => Response.json({ id: KB, name: "Docs" }));
    const out = await tool$pipeshubCreateCollection.tool(core, { name: "Docs" }, ctx());
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/v1/knowledgeBase" });
    expect(JSON.parse(calls[0]!.body as string)).toEqual({ kbName: "Docs" });
    expect(jsonOf(out)).toEqual({
      collectionId: KB,
      name: "Docs",
      url: `https://pipeshub.test/knowledge-base?nodeType=app&nodeId=${KB}`,
    });
  });

  test("a 403 names the missing scope instead of failing silently", async () => {
    const { core } = client(() =>
      Response.json({ error: { message: "Insufficient scope. Required: kb:write" } }, { status: 403 })
    );
    const out = await tool$pipeshubCreateCollection.tool(core, { name: "Docs" }, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("kb:write");
  });
});

describe("pipeshub_upload", () => {
  test("sends multipart files with the server's MIME types and reports each file from the stream", async () => {
    const { core, calls } = client(() =>
      sse([
        ["file:succeeded", { recordId: "r-1", fileName: "a.md" }],
        ["file:failed", { fileName: "b.pdf", errors: ["parse error"], stage: "index", recordId: "r-2" }],
        ["done", { summary: { total: 2, succeeded: 1, failed: 1 } }],
      ])
    );
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [
        { name: "a.md", text: "# Hello" },
        { name: "b.pdf", base64: Buffer.from("%PDF-1.4").toString("base64") },
      ],
    }, ctx());

    expect(calls[0]).toMatchObject({ method: "POST", path: `/api/v1/knowledgeBase/${KB}/upload` });
    const form = calls[0]!.body as FormData;
    const files = form.getAll("files") as File[];
    expect(files.map((f) => [f.name, f.type])).toEqual([["a.md", "text/markdown"], ["b.pdf", "application/pdf"]]);
    expect(await files[0]!.text()).toBe("# Hello");
    expect(JSON.parse(form.get("files_metadata") as string).map((m: { file_path: string }) => m.file_path))
      .toEqual(["a.md", "b.pdf"]);

    expect(jsonOf(out)).toMatchObject({
      uploaded: [{ recordId: "r-1", name: "a.md" }],
      failed: [{ name: "b.pdf", errors: ["parse error"], recordId: "r-2" }],
      summary: { total: 2, succeeded: 1, failed: 1 },
    });
    expect(jsonOf(out).next).toContain("pipeshub_indexing_status");
  });

  test("an unsupported extension or a missing body stops before any request", async () => {
    const { core, calls } = client(() => Response.json({}));
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [{ name: "run.exe", text: "x" }, { name: "notes.md" }],
    }, ctx());
    expect(calls).toHaveLength(0);
    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("run.exe: unsupported extension");
    expect(textOf(out)).toContain("notes.md: give exactly one of text or base64");
  });

  test("over the inline limit, it points at the CLI instead of sending", async () => {
    const { core, calls } = client(() => Response.json({}));
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [{ name: "big.txt", text: "x".repeat(3 * 1024 * 1024 + 1) }],
    }, ctx());
    expect(calls).toHaveLength(0);
    expect(textOf(out)).toContain(`pipeshub upload ${KB}`);
  });

  test("a stream that ends without done says the outcome is incomplete", async () => {
    const { core } = client(() => sse([["file:succeeded", { recordId: "r-1", fileName: "a.md" }]]));
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [{ name: "a.md", text: "hi" }],
    }, ctx());
    expect(jsonOf(out)).toMatchObject({ summary: null, uploaded: [{ recordId: "r-1" }] });
    expect(jsonOf(out).note).toContain("without a summary");
  });

  test("a connection that drops mid-stream keeps what was reported, marked incomplete", async () => {
    const { core } = client(() => {
      const enc = new TextEncoder();
      let sent = false;
      // Error on the read after the first frame: erroring in the same tick drops queued chunks.
      const body = new ReadableStream({
        pull(c) {
          if (sent) return c.error(new Error("socket hang up"));
          sent = true;
          c.enqueue(enc.encode(`event: file:succeeded\ndata: ${JSON.stringify({ recordId: "r-1", fileName: "a.md" })}\n\n`));
        },
      });
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    });
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [{ name: "a.md", text: "hi" }, { name: "b.md", text: "yo" }],
    }, ctx());
    expect(out.isError).toBeFalsy();
    expect(jsonOf(out)).toMatchObject({ uploaded: [{ recordId: "r-1" }], summary: null });
    expect(jsonOf(out).note).toContain("without a summary");
  });

  test("an error frame mid-stream is an error that counts what was stored", async () => {
    const { core } = client(() =>
      sse([["file:succeeded", { recordId: "r-1", fileName: "a.md" }], ["error", { message: "storage down" }]])
    );
    const out = await tool$pipeshubUpload.tool(core, {
      collectionId: KB,
      documents: [{ name: "a.md", text: "hi" }, { name: "b.md", text: "yo" }],
    }, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("storage down");
    expect(textOf(out)).toContain("1 file(s) were stored");
  });
});

describe("pipeshub_indexing_status", () => {
  const record = (id: string, indexingStatus: string, reason?: string) =>
    ({ id, name: `${id}.md`, nodeType: "record", indexingStatus, ...(reason ? { reason } : {}) });

  /** A collection of `counts` records per status; the listing filters by status like the server. */
  function collection(counts: Record<string, number>, reasons: Record<string, string> = {}) {
    return client((_req, seen) => {
      const q = new URLSearchParams(seen.search);
      const wanted = q.get("indexingStatus")?.split(",");
      const limit = Number(q.get("limit"));
      const matching = Object.entries(counts)
        .filter(([s]) => !wanted || wanted.includes(s))
        .flatMap(([s, n]) => Array.from({ length: n }, (_, i) => record(`${s}-${i}`, s, reasons[s])));
      return Response.json({ items: matching.slice(0, limit), pagination: { totalItems: matching.length } });
    });
  }

  test("counts pending and failed exactly from filtered listings, and is not done while any are queued", async () => {
    const { core, calls } = collection({ COMPLETED: 3, QUEUED: 1, FAILED: 1 }, { FAILED: "corrupt file" });
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(calls.every((c) => c.path === `/api/v1/knowledgeBase/knowledge-hub/nodes/app/${KB}`)).toBe(true);
    const q = new URLSearchParams(calls[0]!.search);
    expect([q.get("flattened"), q.get("nodeTypes")]).toEqual(["true", "record"]);
    expect(out).toMatchObject({
      done: false,
      total: 5,
      pendingCount: 1,
      failedCount: 1,
      pending: [{ status: "QUEUED" }],
      failed: [{ status: "FAILED", reason: "corrupt file" }],
    });
  });

  test("a collection past any page size still reaches done when nothing is pending", async () => {
    // A capped listing would report "not done" forever here; the totals do not.
    const { core } = collection({ COMPLETED: 5000, FAILED: 2 });
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: true, total: 5002, pendingCount: 0, failedCount: 2 });
    expect(out.failed).toHaveLength(2);
  });

  test("lists at most 25 pending records but counts them all", async () => {
    const { core } = collection({ IN_PROGRESS: 40 });
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out.pendingCount).toBe(40);
    expect(out.pending).toHaveLength(25);
  });

  test("an empty collection says so", async () => {
    const { core } = collection({});
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: true, total: 0 });
    expect(out.note).toContain("no records");
  });
});

describe("pipeshub_connect_source", () => {
  test("links to the scoped connector pages, keeping the connector the redirect would drop", async () => {
    const { core, calls } = client(() => Response.json({}));
    const out = jsonOf(await tool$pipeshubConnectSource.tool(core, { connector: "Jira" }, ctx()));
    expect(calls).toHaveLength(0);
    expect(out.url).toBe("https://pipeshub.test/workspace/connectors/personal/?connectorType=Jira");
    expect(out.adminUrl).toBe("https://pipeshub.test/workspace/connectors/team/?connectorType=Jira");
  });

  test("without a connector, the link opens the full list", async () => {
    const { core } = client(() => Response.json({}));
    const out = jsonOf(await tool$pipeshubConnectSource.tool(core, {}, ctx()));
    expect(out.url).toBe("https://pipeshub.test/workspace/connectors/personal/");
  });
});
