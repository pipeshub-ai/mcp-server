import { beforeEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { decodeCite, encodeCite, SHOW_CITATIONS_HINT, withoutCitations } from "../src/mcp-server/cite.js";
import { CITATION_VIEWER_URI, clearAppsMemory } from "../src/mcp-server/citation-viewer.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { SHOW_CITATIONS_STEP } from "../src/mcp-server/instructions.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { trimCitations } from "../src/mcp-server/tools/_helpers.js";
import { groupSearchResults } from "../src/mcp-server/tools/_searchResults.js";
import {
  clearPreviewCache,
  FILE_CACHE_MAX_BYTES,
  PREVIEW_CHUNK_BYTES,
  tool$pipeshubPreviewRecord,
} from "../src/mcp-server/tools/pipeshubPreviewRecord.js";
import { tool$pipeshubShowCitations } from "../src/mcp-server/tools/pipeshubShowCitations.js";

// The citation viewer is the MCP Apps view a host such as Claude shows after
// an answer: the model calls `pipeshub_show_citations` with the cite codes of
// the passages it relied on. A host finds the view through that tool's
// `_meta`, loads it as a `ui://` resource, and the view loads a cited file
// through an app-only tool. Hosts without MCP Apps see only the text.

const RID = "7ada7d80-62c4-425c-a125-d65a1ea3101a";
const BOX = [
  { x: 0.1437, y: 0.1708, _id: "a" },
  { x: 0.9057, y: 0.1708, _id: "b" },
  { x: 0.9057, y: 0.3208, _id: "c" },
  { x: 0.1437, y: 0.3208, _id: "d" },
];

const SHOWS_APPS = {
  extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } },
};

async function connect(chat = true, capabilities: ClientCapabilities = SHOWS_APPS) {
  const { server } = createMCPServer({
    logger: createConsoleLogger("error"),
    chat,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" }, { capabilities });
  await client.connect(clientSide);
  return client;
}

describe("citation viewer registration", () => {
  test("the show tool points hosts at the viewer, under both spellings of the key; chat does not", async () => {
    const tools = (await (await connect()).listTools()).tools;
    expect(tools.find((t) => t.name === "pipeshub_show_citations")?._meta).toEqual({
      ui: { resourceUri: CITATION_VIEWER_URI },
      "ui/resourceUri": CITATION_VIEWER_URI,
    });
    expect(tools.find((t) => t.name === "pipeshub_chat")?._meta).toBeUndefined();
  });

  test("the preview tool is for the view only", async () => {
    const client = await connect();
    const tool = (await client.listTools()).tools.find((t) => t.name === "pipeshub_preview_record");
    expect(tool?._meta).toEqual({ ui: { visibility: ["app"] } });
  });

  test("the viewer is one self-contained MCP Apps page", async () => {
    const client = await connect();
    const { contents } = await client.readResource({ uri: CITATION_VIEWER_URI });
    const page = contents[0] as { mimeType?: string; text?: string };
    expect(page.mimeType).toBe("text/html;profile=mcp-app");
    expect(page.text).toStartWith("<!doctype html>");
    // The bundled script is inlined: nothing is left to fetch, and nothing
    // inside it closes the script tag early.
    expect(page.text).not.toContain("/*VIEW_SCRIPT*/");
    expect(page.text).not.toMatch(/<script[^>]*\ssrc=/);
    expect(page.text!.match(/<\/script/g)).toHaveLength(1);
  });

  test("with chat off the search path still shows its sources", async () => {
    const client = await connect(false);
    const tools = (await client.listTools()).tools;
    const names = tools.map((t) => t.name);
    expect(names).toContain("pipeshub_show_citations");
    expect(names).toContain("pipeshub_preview_record");
    expect(tools.find((t) => t.name === "pipeshub_show_citations")?.description)
      .not.toContain("pipeshub_chat");
    const { contents } = await client.readResource({ uri: CITATION_VIEWER_URI });
    expect(contents).toHaveLength(1);
  });
});

describe("a client without MCP Apps views", () => {
  beforeEach(() => clearAppsMemory());
  const CITATION_TOOLS = ["pipeshub_show_citations", "pipeshub_preview_record"];
  const serverFor = (bearerAuth: string) =>
    createMCPServer({
      logger: createConsoleLogger("error"),
      security: { bearerAuth },
      serverURL: "http://pipeshub.test/api/v1",
    }).server;

  async function initialized(bearerAuth: string, capabilities: ClientCapabilities) {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await serverFor(bearerAuth).connect(serverSide);
    const client = new Client({ name: "test", version: "0" }, { capabilities });
    await client.connect(clientSide);
    return client;
  }

  /** tools/list on a fresh server with no initialize, as a stateless server sees it. */
  async function listedStateless(bearerAuth: string): Promise<string[]> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await serverFor(bearerAuth).connect(serverSide);
    const reply = new Promise<string[]>((resolve) => {
      clientSide.onmessage = (m) =>
        resolve(((m as { result: { tools: Array<{ name: string }> } }).result.tools).map((t) => t.name));
    });
    await clientSide.start();
    await clientSide.send({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    return reply;
  }

  test("gets no citation tools and no step asking for the card, so it makes no extra call", async () => {
    const client = await initialized("tok-a", {});
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("pipeshub_search");
    for (const name of CITATION_TOOLS) expect(names).not.toContain(name);
    expect(client.getInstructions()).not.toContain("pipeshub_show_citations");
    const call = await client.callTool({
      name: "pipeshub_show_citations",
      arguments: { citations: [{ cite: `${RID}....` }] },
    });
    expect(call.isError).toBe(true);
  });

  test("a client that shows views keeps them, and the step", async () => {
    const client = await initialized("tok-a", SHOWS_APPS);
    const names = (await client.listTools()).tools.map((t) => t.name);
    for (const name of CITATION_TOOLS) expect(names).toContain(name);
    expect(client.getInstructions()).toContain(SHOW_CITATIONS_STEP);
  });

  test("a stateless server's later request knows what the caller's initialize said", async () => {
    await initialized("tok-a", {});
    await initialized("tok-b", SHOWS_APPS);
    const a = await listedStateless("tok-a");
    expect(a).toContain("pipeshub_search");
    for (const name of CITATION_TOOLS) expect(a).not.toContain(name);
    for (const name of CITATION_TOOLS) expect(await listedStateless("tok-b")).toContain(name);
    // A caller never seen at initialize keeps the card.
    for (const name of CITATION_TOOLS) expect(await listedStateless("tok-c")).toContain(name);
  });

  test("its results carry no cite codes, no hint and no Cite line", () => {
    const search = JSON.stringify({
      records: [{ recordId: RID, passages: [{ text: "x", cite: `${RID}.1.2..` }] }],
      next: SHOW_CITATIONS_HINT,
    });
    const read = `Record ID: ${RID}\n\nbody\nCite: ${RID}.... (this record; a search passage's own cite marks the passage). `
      + SHOW_CITATIONS_HINT;
    const out = withoutCitations({
      content: [{ type: "text", text: search }, { type: "text", text: read }],
    }).content.map((c) => (c as { text: string }).text);
    expect(JSON.parse(out[0]!)).toEqual({ records: [{ recordId: RID, passages: [{ text: "x" }] }] });
    expect(out[1]).toBe(`Record ID: ${RID}\n\nbody`);
  });
});

describe("cite codes", () => {
  test("a PDF passage round-trips with its page, block and box", () => {
    const cite = encodeCite({ recordId: RID, pageNum: [1], blockNum: [2], bounding_box: BOX })!;
    expect(cite).toBe(`${RID}.1.2..144_171_906_321`);
    expect(cite.length).toBeLessThanOrEqual(70);
    expect(decodeCite(cite)).toEqual({
      recordId: RID,
      pageNum: [1],
      blockNum: [2],
      boundingBox: [
        { x: 0.144, y: 0.171 },
        { x: 0.906, y: 0.171 },
        { x: 0.906, y: 0.321 },
        { x: 0.144, y: 0.321 },
      ],
    });
  });

  test("a spreadsheet row keeps its sheet; missing fields stay missing", () => {
    expect(decodeCite(encodeCite({ recordId: "6ae460ea0b29ff7670d82c0b", blockNum: [43], sheetNum: 2 })!))
      .toEqual({ recordId: "6ae460ea0b29ff7670d82c0b", blockNum: [43], sheetNum: 2 });
    expect(decodeCite(encodeCite({ recordId: RID })!)).toEqual({ recordId: RID });
    // A record PipesHub cannot preview keeps saying so after the round trip.
    const unrenderable = encodeCite({ recordId: RID, blockNum: [4], previewRenderable: false })!;
    expect(unrenderable.endsWith(".n")).toBe(true);
    expect(decodeCite(unrenderable)).toEqual({ recordId: RID, blockNum: [4], previewRenderable: false });
    expect(decodeCite(`${RID}.....n`)).toEqual({ recordId: RID, previewRenderable: false });
    expect(decodeCite(`${RID}.....x`)).toBeUndefined();
  });

  test("no record id, no cite", () => {
    expect(encodeCite({ pageNum: [1] })).toBeUndefined();
    expect(encodeCite({ recordId: "../etc/passwd" })).toBeUndefined();
  });

  test.each([
    "",
    "not a cite",
    `${RID}`,
    `${RID}.1.2`,
    `${RID}.1.2..144_171_906`,
    `${RID}.1.2..1440_171_906_321`,
    `${RID}.1.2..906_171_144_321`,
    `${RID}.-1.2..`,
    `${RID}.1.2..<script>`,
    `${"a".repeat(65)}....`,
  ])("rejects %p", (cite) => {
    expect(decodeCite(cite)).toBeUndefined();
  });

  test("search passages and chat citations carry their cite", () => {
    const [entry] = groupSearchResults([
      { content: "The certificate ID is NWSL-PT-2026-0417.", score: 0.9,
        metadata: { recordId: RID, recordName: "Report", pageNum: [1], blockNum: [2], bounding_box: BOX } },
    ], []);
    expect(entry?.passages[0]?.cite).toBe(`${RID}.1.2..144_171_906_321`);

    const [citation] = trimCitations([{ citationData: { content: "x", chunkIndex: 1,
      metadata: { recordId: RID, pageNum: [3], blockNum: [11] } } }]);
    expect(citation?.cite).toBe(`${RID}.3.11..`);
  });
});

describe("pipeshub_show_citations", () => {
  const ctx = () => ({ signal: new AbortController().signal }) as never;
  const header = "<record>\nRecord ID: R\nName: Contoso-Pentest-Report.pdf\nMIME Type: application/pdf\n"
    + "Web URL: https://pipeshub.test/record/R\n\nRecord blocks (sorted):\n\nName: not a header line";

  function client(reads: string[], status = 200) {
    const fetcher = async (input: RequestInfo | URL) => {
      reads.push(new URL((input as Request).url).pathname);
      return Response.json({ content: header }, { status });
    };
    return new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });
  }

  test("builds the viewer's citations in the answer's order, reading each record once", async () => {
    const reads: string[] = [];
    const out = await tool$pipeshubShowCitations.tool(client(reads), {
      citations: [
        { cite: `${RID}.1.2..144_171_906_321`, quote: "The certificate ID is NWSL-PT-2026-0417." },
        { cite: `${RID}.4.15..` },
      ],
    }, ctx());
    expect(reads).toEqual([`/api/v1/connectors/record/${RID}/content`]);
    expect(out.content).toEqual([{
      type: "text",
      // Clients without the viewer see only this, so it names each source.
      text: "Shown to the user: 2 citations from 1 record, without your answer. "
        + "Now write the full answer, citing these as [1]…[2]:\n"
        + "[1] Contoso-Pentest-Report.pdf, page 1 (https://pipeshub.test/record/R)\n"
        + "[2] Contoso-Pentest-Report.pdf, page 4 (https://pipeshub.test/record/R)",
    }]);
    const data = (out._meta as any)["pipeshub/citations"].citations;
    expect(data[0]).toMatchObject({
      number: 1, recordId: RID, recordName: "Contoso-Pentest-Report.pdf", extension: "pdf",
      mimeType: "application/pdf", webUrl: "https://pipeshub.test/record/R",
      pageNum: [1], blockNum: [2], text: "The certificate ID is NWSL-PT-2026-0417.",
    });
    expect(data[0].boundingBox).toHaveLength(4);
    expect(data[1]).toMatchObject({ number: 2, pageNum: [4], blockNum: [15], text: "" });
  });

  test("a record it cannot read still opens, as \"Source\"", async () => {
    const out = await tool$pipeshubShowCitations.tool(client([], 403), {
      citations: [{ cite: `${RID}.1...` }],
    }, ctx());
    expect((out._meta as any)["pipeshub/citations"].citations[0].recordName).toBe("Source");
  });

  test("a made-up cite is an error that names it, and nothing is fetched", async () => {
    const reads: string[] = [];
    const out = await tool$pipeshubShowCitations.tool(client(reads), {
      citations: [{ cite: `${RID}.1...` }, { cite: "[1]" }],
    }, ctx());
    expect(out.isError).toBe(true);
    expect((out.content[0] as any).text).toContain("Citation 2");
    expect(reads).toEqual([]);
  });
});

describe("pipeshub_preview_record", () => {
  const ctx = () => ({ signal: new AbortController().signal }) as never;
  beforeEach(() => clearPreviewCache());

  /** A backend serving `file`, counting downloads; `token` is the caller's credential. */
  function client(file: Uint8Array, status = 200, token = "t", downloads = { n: 0 }) {
    const fetcher = async () => {
      downloads.n++;
      return new Response(file, { status, headers: { "content-type": "application/pdf" } });
    };
    return new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: token },
      httpClient: new HTTPClient({ fetcher }),
    });
  }

  test("all the slices of one file come from one download", async () => {
    const file = new Uint8Array(PREVIEW_CHUNK_BYTES * 3 + 1);
    const downloads = { n: 0 };
    const core = client(file, 200, "t", downloads);
    let offset: number | undefined = 0;
    let slices = 0;
    while (offset !== undefined) {
      const out = await tool$pipeshubPreviewRecord.tool(core, { recordId: "r1", offset }, ctx());
      offset = (out.structuredContent as any).nextOffset;
      slices++;
    }
    expect({ slices, downloads: downloads.n }).toEqual({ slices: 4, downloads: 1 });
  });

  test("a file larger than the cache can hold is refused before its body is read", async () => {
    // A body that never ends: reading it would hang the test.
    const body = new ReadableStream({ pull: () => new Promise<void>(() => {}) });
    const fetcher = async () => new Response(body, {
      headers: { "content-type": "application/pdf", "content-length": String(FILE_CACHE_MAX_BYTES + 1) },
    });
    const core = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });
    const out = await tool$pipeshubPreviewRecord.tool(core, { recordId: "r1", offset: 0 }, ctx());
    expect(out.isError).toBe(true);
    expect((out.content[0] as { text: string }).text).toContain("too large to preview");
  });

  test("one user's cached file never answers another user", async () => {
    const mine = { n: 0 };
    const theirs = { n: 0 };
    await tool$pipeshubPreviewRecord.tool(client(new Uint8Array([1]), 200, "alice", mine), { recordId: "r1", offset: 0 }, ctx());
    const out = await tool$pipeshubPreviewRecord.tool(client(new Uint8Array([2, 2]), 200, "bob", theirs), { recordId: "r1", offset: 0 }, ctx());
    expect((out.structuredContent as any).totalBytes).toBe(2);
    expect({ mine: mine.n, theirs: theirs.n }).toEqual({ mine: 1, theirs: 1 });
  });

  test("returns a large file in slices that join back into the file", async () => {
    const file = Uint8Array.from({ length: PREVIEW_CHUNK_BYTES + 10 }, (_, i) => i % 251);
    const core = client(file);
    const parts: Buffer[] = [];
    let offset: number | undefined = 0;
    while (offset !== undefined) {
      const out = await tool$pipeshubPreviewRecord.tool(core, { recordId: "r1", offset }, ctx());
      const sc = out.structuredContent as any;
      expect(sc).toMatchObject({ mimeType: "application/pdf", totalBytes: file.length, offset });
      parts.push(Buffer.from(sc.bytes, "base64"));
      offset = sc.nextOffset;
    }
    expect(parts).toHaveLength(2);
    expect(new Uint8Array(Buffer.concat(parts))).toEqual(file);
  });

  test("an offset past the end returns an empty last slice", async () => {
    const out = await tool$pipeshubPreviewRecord.tool(client(new Uint8Array(4)), { recordId: "r1", offset: 99 }, ctx());
    expect(out.structuredContent).toEqual({ mimeType: "application/pdf", totalBytes: 4, offset: 4, bytes: "" });
  });

  test("a refused record is an error, not an empty file", async () => {
    const out = await tool$pipeshubPreviewRecord.tool(client(new Uint8Array(0), 403), { recordId: "r1", offset: 0 }, ctx());
    expect(out.isError).toBe(true);
  });
});
