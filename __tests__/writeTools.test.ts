import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubAddWebSource } from "../src/mcp-server/tools/pipeshubAddWebSource.js";
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
  const record = (id: string, indexingStatus: string, reason?: string, isInternal = false) =>
    ({ id, name: `${id}.md`, nodeType: "record", indexingStatus, isInternal, ...(reason ? { reason } : {}) });

  /**
   * A source with `counts` records per status. The stats route counts them as
   * the server does, leaving out `internal` ones (a crawl's folder placeholders,
   * which stay NOT_STARTED); the listing filters by status and includes them.
   */
  function collection(
    counts: Record<string, number>,
    reasons: Record<string, string> = {},
    internal = 0,
    connector: Response | (() => Response) = () => Response.json({ success: true, connector: { status: "IDLE" } }),
  ) {
    return client((_req, seen) => {
      if (seen.path === `/api/v1/connectors/${KB}`) return typeof connector === "function" ? connector() : connector;
      if (seen.path === `/api/v1/connectors/${KB}/stats`) {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return Response.json({ success: true, data: { stats: { total, indexingStatus: counts } } });
      }
      const q = new URLSearchParams(seen.search);
      const wanted = q.get("indexingStatus")?.split(",");
      const limit = Number(q.get("limit"));
      const placeholders = Array.from({ length: internal }, (_, i) => record(`folder-${i}`, "NOT_STARTED", undefined, true));
      const matching = [
        ...placeholders,
        ...Object.entries(counts).flatMap(([s, n]) => Array.from({ length: n }, (_, i) => record(`${s}-${i}`, s, reasons[s]))),
      ].filter((r) => !wanted || wanted.includes(r.indexingStatus));
      return Response.json({ items: matching.slice(0, limit), pagination: { totalItems: matching.length } });
    });
  }

  test("counts from the source's stats, names records from filtered listings, and is not done while any are queued", async () => {
    const { core, calls } = collection({ COMPLETED: 3, QUEUED: 1, FAILED: 1 }, { FAILED: "corrupt file" });
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(calls.map((c) => c.path).sort()).toEqual([
      `/api/v1/connectors/${KB}`,
      `/api/v1/connectors/${KB}/stats`,
      `/api/v1/knowledgeBase/knowledge-hub/nodes/app/${KB}`,
      `/api/v1/knowledgeBase/knowledge-hub/nodes/app/${KB}`,
    ]);
    const listing = calls.find((c) => c.path.includes("knowledge-hub"))!;
    const q = new URLSearchParams(listing.search);
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

  // A crawl's folder placeholders stay NOT_STARTED for good: counted, they would keep a web source "not done" forever.
  test("a crawl whose pages are all indexed is done, its folder placeholders left out", async () => {
    const { core } = collection({ COMPLETED: 5 }, {}, 2);
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: true, total: 5, pendingCount: 0, pending: [] });
  });

  // A crawl stores pages in batches: those stored can all be indexed before the next batch.
  test("a source that is still syncing is not done, even with nothing pending", async () => {
    const { core } = collection({ COMPLETED: 10 }, {}, 0, () =>
      Response.json({ success: true, connector: { status: "SYNCING" } }));
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: false, syncing: true, total: 10, pendingCount: 0 });
  });

  test("a refused sync-state check (a collection, or no connector:read) leaves the counts in charge", async () => {
    const { core } = collection({ COMPLETED: 3 }, {}, 0, () =>
      Response.json({ error: { message: "Insufficient scope. Required: connector:read" } }, { status: 403 }));
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: true, total: 3 });
    expect(out.syncing).toBeUndefined();
  });

  test("nothing stored yet is not done, so a crawl that just started is polled again", async () => {
    const { core } = collection({});
    const out = jsonOf(await tool$pipeshubIndexingStatus.tool(core, { collectionId: KB }, ctx()));
    expect(out).toMatchObject({ done: false, total: 0 });
    expect(out.note).toContain("Keep polling");
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

describe("pipeshub_add_web_source", () => {
  const CONN = "9b1e2c3d-4f5a-4b6c-8d7e-0f1a2b3c4d5e";
  const ok = (calls: Seen[]) => (seen: Seen) =>
    seen.path === "/api/v1/connectors"
      ? Response.json({ success: true, connector: { connectorId: CONN } })
      : Response.json({ success: true });

  test("creates a personal Web connector, saves the crawl and starts it, as the settings page does", async () => {
    const { core, calls } = client((_req, seen) => ok(calls)(seen));
    const out = await tool$pipeshubAddWebSource.tool(
      core,
      { url: "https://docs.example.com/guide/", maxPages: 50 },
      ctx(),
    );
    expect(out.isError).toBeFalsy();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /api/v1/connectors",
      `PUT /api/v1/connectors/${CONN}/config/filters-sync`,
      `POST /api/v1/connectors/${CONN}/toggle`,
    ]);
    expect(JSON.parse(calls[0]!.body as string)).toEqual({
      connectorType: "Web",
      instanceName: "docs.example.com",
      scope: "personal",
      authType: "NONE",
      config: { auth: {} },
    });
    const sync = JSON.parse(calls[1]!.body as string).sync;
    const crawl = { url: "https://docs.example.com/guide/", type: "recursive", max_pages: 50 };
    expect(sync).toMatchObject({ selectedStrategy: "SCHEDULED", customValues: crawl, ...crawl });
    expect(sync.scheduledConfig.intervalMinutes).toBe(1440);
    expect(JSON.parse(calls[2]!.body as string)).toEqual({ type: "sync" });
    expect(jsonOf(out)).toMatchObject({ connectorId: CONN, name: "docs.example.com", maxPages: 50 });
  });

  test("defaults to the connector's own 100 pages and takes a name", async () => {
    const { core, calls } = client((_req, seen) => ok(calls)(seen));
    await tool$pipeshubAddWebSource.tool(core, { url: "https://example.com", name: "Example" }, ctx());
    expect(JSON.parse(calls[0]!.body as string).instanceName).toBe("Example");
    expect(JSON.parse(calls[1]!.body as string).sync.max_pages).toBe(100);
  });

  test("a later failure names the connector it created, so the person can finish it", async () => {
    const { core, calls } = client((_req, seen) =>
      seen.path.endsWith("/toggle")
        ? Response.json({ error: { message: "Insufficient scope. Required: connector:sync" } }, { status: 403 })
        : ok(calls)(seen)
    );
    const out = await tool$pipeshubAddWebSource.tool(core, { url: "https://example.com" }, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain(CONN);
    expect(textOf(out)).toContain("connector:sync");
    expect(textOf(out)).toContain("/workspace/connectors/personal/");
  });

  test("a refused create stops before anything else and names the scope", async () => {
    const { core, calls } = client(() =>
      Response.json({ error: { message: "Insufficient scope. Required: connector:write" } }, { status: 403 })
    );
    const out = await tool$pipeshubAddWebSource.tool(core, { url: "https://example.com" }, ctx());
    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("connector:write");
    expect(calls).toHaveLength(1);
  });

  test("accepts only http(s) start URLs and is hidden from a read-only or write-only server", () => {
    const url = tool$pipeshubAddWebSource.args.url;
    expect(url.safeParse("https://example.com").success).toBe(true);
    expect(url.safeParse("file:///etc/passwd").success).toBe(false);
    expect(url.safeParse("not a url").success).toBe(false); // a validation error, not a throw
    expect(url.safeParse("ftp://example.com").success).toBe(false);
    expect(tool$pipeshubAddWebSource.scopes).toEqual(["write", "connect"]);
  });
});
