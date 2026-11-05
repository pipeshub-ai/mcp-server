import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { tool$pipeshubGetRecordContent } from "../src/mcp-server/tools/pipeshubGetRecordContent.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";
import { forgetSearches } from "../src/mcp-server/tools/_searchResults.js";
import { searchResultText } from "../src/mcp-server/tools/_searchText.js";

// The read tools declare an output schema and send `structuredContent`
// beside the text. A client that ignores structured output must get the same
// text as before, byte for byte; the real MCP client used here validates the
// structured form against the schema the server lists.

const RECORD = "rec-1";
const HEADER = [
  "Record ID: rec-1",
  "Name: Leave policy",
  "Connector: CONFLUENCE",
  "Last Updated At: 2026-10-01T09:00:00Z",
  "Web URL: https://wiki.example.com/leave",
].join("\n");

function backend(path: string): Response {
  if (path.endsWith("/search")) {
    return Response.json({
      searchResponse: {
        searchResults: [{ content: "20 days", score: 0.9, metadata: { recordId: RECORD, recordName: "Leave policy" } }],
        records: [{ _key: RECORD, recordName: "Leave policy", webUrl: "https://wiki.example.com/leave", connectorName: "CONFLUENCE" }],
      },
    });
  }
  if (path.includes("/content")) {
    return Response.json({ content: `${HEADER}\n\nStaff get 20 days.`, complete: true, totalBlocks: 1 });
  }
  if (path.endsWith("/navigate")) return Response.json({ text: "Children 1-1 of 1:\n- page", rows: [] });
  if (path.endsWith("/agents")) return Response.json({ agents: [{ _key: "a1", name: "Helper" }], pagination: { hasNext: false } });
  return Response.json({ items: [], pagination: { hasNext: false } });
}

const sdk = () =>
  new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "pat" },
    httpClient: new HTTPClient({ fetcher: async (input) => backend(new URL((input as Request).url).pathname) }),
  });

async function connect() {
  const { server } = createMCPServer({ logger: createConsoleLogger("error"), getSDK: sdk, apps: false });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const textOf = (r: { content: unknown }) =>
  (r.content as Array<{ text?: string }>).map((c) => c.text ?? "").join("");

describe("structured output", () => {
  test("the read tools list an output schema; the others do not", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const withSchema = tools.filter((t) => t.outputSchema).map((t) => t.name).sort();
    expect(withSchema).toEqual([
      "pipeshub_agents",
      "pipeshub_browse",
      "pipeshub_indexing_status",
      "pipeshub_read_record",
      "pipeshub_read_thread",
      "pipeshub_resolve_reference",
      "pipeshub_search",
      "pipeshub_sources",
    ]);
  });

  test("search sends its JSON as structuredContent beside its text, with citation fields", async () => {
    forgetSearches();
    const direct = await tool$pipeshubSearch.tool(sdk(), { query: "leave" } as never, ctx());
    forgetSearches();
    const client = await connect();
    const r = await client.callTool({ name: "pipeshub_search", arguments: { query: "leave" } });
    // The direct call keeps cite codes the client (no MCP Apps) does not get.
    const json = JSON.parse(textOf(direct), (k, v) => (k === "cite" || k === "next" ? undefined : v));
    expect(r.structuredContent).toEqual(json);
    expect(textOf(r)).toBe(searchResultText(json));
    expect((r.structuredContent as any).records[0]).toMatchObject({
      recordId: RECORD,
      recordName: "Leave policy",
      webUrl: "https://wiki.example.com/leave",
    });
  });

  test("a content read carries the record's citation fields and the same text", async () => {
    const client = await connect();
    const r = await client.callTool({ name: "pipeshub_read_record", arguments: { recordId: RECORD } });
    expect(r.structuredContent).toMatchObject({
      mode: "content",
      recordId: RECORD,
      recordName: "Leave policy",
      webUrl: "https://wiki.example.com/leave",
      connector: "CONFLUENCE",
      updatedAt: "2026-10-01T09:00:00Z",
      complete: true,
      text: textOf(r),
    });
    // Same text as a direct call, less the cite line this client does not show.
    const direct = await tool$pipeshubGetRecordContent.tool(sdk(), { mode: "content", recordId: RECORD } as never, ctx());
    expect(textOf(direct).startsWith(textOf(r))).toBe(true);
  });

  test("browse, agents and sources validate against their schemas too", async () => {
    const client = await connect();
    const nav = await client.callTool({ name: "pipeshub_browse", arguments: { nodeId: "n1" } });
    expect(nav.structuredContent).toEqual({ mode: "navigate", text: textOf(nav) });
    const agents = await client.callTool({ name: "pipeshub_agents", arguments: {} });
    expect(agents.structuredContent).toEqual(JSON.parse(textOf(agents)));
    const sources = await client.callTool({ name: "pipeshub_sources", arguments: { include: ["sources"] } });
    expect(sources.isError).toBeFalsy();
    expect(sources.structuredContent).toEqual(JSON.parse(textOf(sources)));
  });
});
