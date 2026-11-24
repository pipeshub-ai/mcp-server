import { readdir } from "node:fs/promises";
import { beforeEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { decodeCite, decodeCiteLoosely, encodeCite, SHOW_CITATIONS_HINT, threadCiteLine, withoutCitations } from "../src/mcp-server/cite.js";
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
    // Every connector logo is inlined once, as a data URI.
    const logos = (await readdir("src/mcp-app/connector-icons")).length;
    expect(page.text!.match(/data:image\/svg\+xml;base64,/g)).toHaveLength(logos);
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

  test("a thread read loses its Cite line and reminder too", () => {
    const thread = `<record>\nRecord ID: ${RID}\n[0] hi\n</record>\n\nRead: the whole thread (1 record).\n`
      + threadCiteLine([RID]) + SHOW_CITATIONS_HINT;
    const [out] = withoutCitations({ content: [{ type: "text", text: thread }] }).content;
    expect((out as { text: string }).text)
      .toBe(`<record>\nRecord ID: ${RID}\n[0] hi\n</record>\n\nRead: the whole thread (1 record).`);
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

  test("read loosely, an exact cite decodes as before", () => {
    expect(decodeCiteLoosely(`${RID}.1.2..144_171_906_321`)).toEqual({
      location: decodeCite(`${RID}.1.2..144_171_906_321`)!, exact: true,
    });
    // Wrappers agents add are not part of the code.
    expect(decodeCiteLoosely(` \`${RID}..7...n\` `)).toEqual({
      location: { recordId: RID, blockNum: [7], previewRenderable: false }, exact: true,
    });
    expect(decodeCiteLoosely(`cite: ${RID}..7...n`)?.exact).toBe(true);
    // Wrappers around the whole `Cite: …`, or around the code after the prefix.
    expect(decodeCiteLoosely(`\`Cite: ${RID}..7...n\``)?.exact).toBe(true);
    expect(decodeCiteLoosely(`Cite: \`${RID}..7...n\``)?.exact).toBe(true);
  });

  test.each([
    [`${RID}....n`, { recordId: RID, previewRenderable: false }],
    [`${RID}......n`, { recordId: RID, previewRenderable: false }],
    [`${RID}..7..n`, { recordId: RID, previewRenderable: false }],
    [`${RID}.1.2`, { recordId: RID }],
    [RID, { recordId: RID }],
    ["6ae460ea0b29ff7670d82c0b.43", { recordId: "6ae460ea0b29ff7670d82c0b" }],
  ])("read loosely, %p stands for its whole record", (cite, location) => {
    expect(decodeCiteLoosely(cite)).toEqual({ location, exact: false });
  });

  test.each([
    "[1]",
    "QE-12",
    "rec-1",
    `x${RID}`,
    `https://productnest.slack.com/archives/C0B3U348DNU/p1795089495075859`,
  ])("read loosely, %p is still not a cite", (cite) => {
    expect(decodeCiteLoosely(cite)).toBeUndefined();
  });

  // Seen on Claude with a real Slack thread: given `R..k...n` to fill in, it
  // sent `R..1...1` for every message. The line now spells each code out.
  test("a thread read's Cite line spells out each message's code, and each decodes", () => {
    const content = `<record>\nRecord ID: ${RID}\n[text_section #0]\n[0] **Ana**: one\n\n[1] **Bo**: two\n</record>\n`
      + "<record>\nRecord ID: 6ae460ea0b29ff7670d82c0b\n[0] **Cy**: three\n</record>";
    const line = threadCiteLine([RID, "6ae460ea0b29ff7670d82c0b", RID], content)!;
    expect(line).toBe(
      "Cite: each message by its own code, copied whole (it ends in the letter n): "
        + `record ${RID}: [0] ${RID}..0...n, [1] ${RID}..1...n; `
        + "record 6ae460ea0b29ff7670d82c0b: [0] 6ae460ea0b29ff7670d82c0b..0...n. ",
    );
    expect(decodeCite(`${RID}..1...n`)).toEqual({ recordId: RID, blockNum: [1], previewRenderable: false });
    expect(threadCiteLine([])).toBeUndefined();
    expect(threadCiteLine(["../etc/passwd"])).toBeUndefined();
  });

  test("a record whose messages the text does not number gets the rule, with the letter n named", () => {
    expect(threadCiteLine([RID])).toBe(
      "Cite: each message by its own code, copied whole (it ends in the letter n): "
        + `record ${RID}: message [k] is ${RID}..k...n with the number for k and the letter n kept last `
        + `(so [0] is ${RID}..0...n). `,
    );
  });

  test("a long thread lists codes up to the cap, then names the rule for the rest", () => {
    const many = (id: string, n: number) => `Record ID: ${id}\n` + Array.from({ length: n }, (_, i) => `[${i}] m${i}\n`).join("");
    const other = "6ae460ea0b29ff7670d82c0b";
    const line = threadCiteLine([RID, other], `${many(RID, 50)}${many(other, 20)}`)!;
    expect(line).toContain(`[49] ${RID}..49...n`);
    expect(line).toContain(`record ${other}: message [k] is ${other}..k...n`);
    expect(line).not.toContain(`[0] ${other}..0...n,`);
  });

  test("read loosely, a thread code whose letter n became a number keeps its message", () => {
    expect(decodeCiteLoosely(`${RID}..1...1`)).toEqual({
      location: { recordId: RID, blockNum: [1], previewRenderable: false }, exact: false,
    });
    expect(decodeCiteLoosely(`${RID}..12...12`)?.location.blockNum).toEqual([12]);
    expect(decodeCiteLoosely(`${RID}..0...1`)?.location.blockNum).toEqual([0]);
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

  function client(reads: string[], status = 200, content = header) {
    const fetcher = async (input: RequestInfo | URL) => {
      reads.push(new URL((input as Request).url).pathname);
      return Response.json({ content }, { status });
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

  test("an app's record carries its connector and no made-up extension", async () => {
    const page = "<record>\nRecord ID: R\nName: BBS015 SAAS: Bug Bash Session\nConnector: CONFLUENCE\n"
      + "Type: WEBPAGE\nMIME Type: text/html\n\nbody";
    const out = await tool$pipeshubShowCitations.tool(client([], 200, page), {
      citations: [{ cite: `${RID}.1...` }],
    }, ctx());
    const [c] = (out._meta as any)["pipeshub/citations"].citations;
    expect(c).toMatchObject({ connector: "CONFLUENCE", mimeType: "text/html" });
    expect(c.extension).toBeUndefined();
  });

  test("a record it cannot read still opens, as \"Source\"", async () => {
    const out = await tool$pipeshubShowCitations.tool(client([], 403), {
      citations: [{ cite: `${RID}.1...` }],
    }, ctx());
    expect((out._meta as any)["pipeshub/citations"].citations[0].recordName).toBe("Source");
  });

  test("when every cite is made up, it is an error that names them, and nothing is fetched", async () => {
    const reads: string[] = [];
    const out = await tool$pipeshubShowCitations.tool(client(reads), {
      citations: [{ cite: "[1]" }, { cite: "https://productnest.slack.com/archives/C0B3U348DNU/p1795089495075859" }],
    }, ctx());
    expect(out.isError).toBe(true);
    expect((out.content[0] as any).text).toContain("Citation 1, 2");
    expect(reads).toEqual([]);
  });

  // Seen on Claude: one answer's six cites were all off, and the card was an
  // error instead of sources. A bad cite now costs only itself.
  test("a made-up cite among good ones is left out and named; the rest are shown, renumbered", async () => {
    const out = await tool$pipeshubShowCitations.tool(client([]), {
      citations: [{ cite: `${RID}.1...` }, { cite: "[1]" }, { cite: `${RID}.4.15..`, quote: "q" }],
    }, ctx());
    expect(out.isError).toBeUndefined();
    const text = (out.content[0] as any).text as string;
    expect(text).toContain("Shown to the user: 2 citations from 1 record");
    expect(text).toContain("[2] Contoso-Pentest-Report.pdf, page 4");
    expect(text).toContain("Not shown: your citation 2,");
    const data = (out._meta as any)["pipeshub/citations"].citations;
    expect(data.map((c: any) => [c.number, c.pageNum?.[0], c.text])).toEqual([[1, 1, ""], [2, 4, "q"]]);
  });

  test("a mangled cite of a real record shows that record", async () => {
    const reads: string[] = [];
    const out = await tool$pipeshubShowCitations.tool(client(reads), {
      // One dot short of `.....n`, then the bare record id.
      citations: [{ cite: `${RID}....n` }, { cite: RID }],
    }, ctx());
    expect(out.isError).toBeUndefined();
    expect(reads).toEqual([`/api/v1/connectors/record/${RID}/content`]);
    const data = (out._meta as any)["pipeshub/citations"].citations;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ recordId: RID, recordName: "Contoso-Pentest-Report.pdf", previewRenderable: false });
    expect(data[0].blockNum).toBeUndefined();
    expect(data[1]).toMatchObject({ recordId: RID, recordName: "Contoso-Pentest-Report.pdf" });
  });

  test("a mangled cite of a record that cannot be read is left out, not shown as \"Source\"", async () => {
    const out = await tool$pipeshubShowCitations.tool(client([], 404), {
      citations: [{ cite: `${RID}.1...` }, { cite: `${RID}..1....n` }],
    }, ctx());
    const data = (out._meta as any)["pipeshub/citations"].citations;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ number: 1, recordName: "Source", pageNum: [1] });
    expect((out.content[0] as any).text).toContain("Not shown: your citation 2,");
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
