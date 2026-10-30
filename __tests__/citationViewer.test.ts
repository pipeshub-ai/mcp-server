import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import {
  CITATION_VIEWER_URI,
  citationViewerData,
} from "../src/mcp-server/citation-viewer.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import {
  PREVIEW_CHUNK_BYTES,
  tool$pipeshubPreviewRecord,
} from "../src/mcp-server/tools/pipeshubPreviewRecord.js";

// The citation viewer is the MCP Apps view a host such as Claude shows with a
// `pipeshub_chat` answer. A host finds it through the tool's `_meta`, loads it
// as a `ui://` resource, and the view loads a cited file through an app-only
// tool. Hosts without MCP Apps see none of it.

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
  test("chat points hosts at the viewer, under both spellings of the key", async () => {
    const client = await connect();
    const chat = (await client.listTools()).tools.find((t) => t.name === "pipeshub_chat");
    expect(chat?._meta).toEqual({
      ui: { resourceUri: CITATION_VIEWER_URI },
      "ui/resourceUri": CITATION_VIEWER_URI,
    });
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

  test("with chat off there is no viewer and no preview tool", async () => {
    const client = await connect(false);
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).not.toContain("pipeshub_preview_record");
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });
});

describe("citationViewerData", () => {
  test("carries where each citation is in its record", () => {
    const conv = {
      messages: [{
        messageType: "bot_response",
        content: "Grade B+ [1](http://ui/record/r1)",
        citations: [{
          citationData: {
            content: "The certificate grade is B+.",
            chunkIndex: 1,
            metadata: {
              recordId: "r1",
              recordName: "Pentest report",
              mimeType: "application/pdf",
              extension: "pdf",
              connector: "KB",
              webUrl: "/record/r1",
              pageNum: [1],
              blockNum: [2],
              bounding_box: [
                { x: 0.1, y: 0.2, _id: "a" },
                { x: 0.9, y: 0.2, _id: "b" },
                { x: 0.9, y: 0.3, _id: "c" },
                { x: 0.1, y: 0.3, _id: "d" },
              ],
            },
          },
        }],
      }],
    };

    expect(citationViewerData(conv)).toEqual({
      citations: [{
        number: 1,
        kind: "passage",
        recordId: "r1",
        recordName: "Pentest report",
        webUrl: "/record/r1",
        mimeType: "application/pdf",
        extension: "pdf",
        connector: "KB",
        pageNum: [1],
        blockNum: [2],
        boundingBox: [
          { x: 0.1, y: 0.2 },
          { x: 0.9, y: 0.2 },
          { x: 0.9, y: 0.3 },
          { x: 0.1, y: 0.3 },
        ],
        text: "The certificate grade is B+.",
      }],
    });
  });

  test("a citation without a location still opens, with what it has", () => {
    const conv = {
      messages: [{
        messageType: "bot_response",
        content: "x [1](u)",
        citations: [{ content: "web text", chunkIndex: 1, citationType: "web", metadata: { pageNum: "1" } }],
      }],
    };
    const [c] = citationViewerData(conv).citations;
    expect(c).toMatchObject({ number: 1, kind: "web", text: "web text" });
    expect(c?.pageNum).toBeUndefined();
    expect(c?.boundingBox).toBeUndefined();
  });

  test("no answer yet means no citations", () => {
    expect(citationViewerData({ messages: [] })).toEqual({ citations: [] });
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
