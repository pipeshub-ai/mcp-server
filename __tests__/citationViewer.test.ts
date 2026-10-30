import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { decodeCite, encodeCite } from "../src/mcp-server/cite.js";
import { CITATION_VIEWER_URI } from "../src/mcp-server/citation-viewer.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { trimCitations } from "../src/mcp-server/tools/_helpers.js";
import { groupSearchResults } from "../src/mcp-server/tools/_searchResults.js";
import {
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

async function connect(chat = true) {
  const { server } = createMCPServer({
    logger: createConsoleLogger("error"),
    chat,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
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
      text: "Shown to the user: 2 citations from 1 record. They see the sources here, not your "
        + "answer: if you have not written the answer yet, write it now.",
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

  function client(file: Uint8Array, status = 200) {
    const fetcher = async () =>
      new Response(file, { status, headers: { "content-type": "application/pdf" } });
    return new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });
  }

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
