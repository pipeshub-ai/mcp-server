import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import {
  createMCPServer,
  DEFAULT_MAX_TOOL_INPUT_ELEMENTS,
} from "../src/mcp-server/server.js";

// GHSA-46jr-4wx8-v453: one tool call whose arguments carry a huge array made
// the SDK's validation hold many times the request's size in memory. The
// server now caps the elements in a call's arguments, so such a call is
// refused before any validation and before the tool reaches the backend.

const logger = createConsoleLogger("error");

/** A backend that answers search with one record and refuses anything else. */
function backend() {
  const searches: Array<{ query?: string; filters?: { apps?: string[] } }> = [];
  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const req = input as Request;
    if (req.method === "POST" && new URL(req.url).pathname.endsWith("/search")) {
      searches.push(JSON.parse(await req.text()));
      return Response.json({
        searchId: "s1",
        searchResponse: {
          searchResults: [
            { content: "passage", score: 0.5, metadata: { recordId: "r1", recordName: "r1" } },
          ],
          records: [{ _key: "r1" }],
        },
      });
    }
    return Response.json({ error: { message: "not here" } }, { status: 404 });
  };
  return { fetcher, searches };
}

async function connect(maxToolInputElements?: number) {
  const be = backend();
  const { server } = createMCPServer({
    logger,
    chat: false,
    ...(maxToolInputElements === undefined ? {} : { maxToolInputElements }),
    getSDK: () =>
      new PipeshubCore({
        serverURL: "http://pipeshub.test/api/v1",
        security: { bearerAuth: "pat" },
        httpClient: new HTTPClient({ fetcher: be.fetcher }),
      }),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return { client, backend: be };
}

type ToolResult = { isError?: boolean; content: Array<{ type: string; text?: string }> };

const text = (res: unknown): string =>
  (res as ToolResult).content.map((c) => c.text ?? "").join("\n");

const ids = (n: number) => Array.from({ length: n }, (_, i) => `conn-${i}`);

describe("tool input element cap", () => {
  test("defaults to 10,000", () => {
    expect(DEFAULT_MAX_TOOL_INPUT_ELEMENTS).toBe(10_000);
  });

  test("a search whose apps list goes over the cap is refused before the backend", async () => {
    const { client, backend: be } = await connect();
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "too many", apps: ids(DEFAULT_MAX_TOOL_INPUT_ELEMENTS) },
    });

    expect((res as ToolResult).isError).toBe(true);
    expect(text(res)).toContain(
      "arguments contain more than the maximum of 10000 elements",
    );
    expect(be.searches).toHaveLength(0);
  });

  test("an array of numbers is refused by the cap, not by schema validation", async () => {
    // The advisory's case: elements of the wrong type, each of which schema
    // validation would otherwise report one by one.
    const { client } = await connect();
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "wrong type", apps: new Array(50_000).fill(0) },
    });

    expect((res as ToolResult).isError).toBe(true);
    expect(text(res)).toContain("more than the maximum of 10000 elements");
    expect(text(res)).not.toContain("Input validation error");
  });

  test("a normal search passes and reaches the backend", async () => {
    const { client, backend: be } = await connect();
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "leave policy", apps: ["conn-a", "conn-b"] },
    });

    expect((res as ToolResult).isError).toBeFalsy();
    expect(be.searches).toHaveLength(1);
    expect(be.searches[0]!.query).toBe("leave policy");
    expect(be.searches[0]!.filters?.apps).toEqual(["conn-a", "conn-b"]);
  });

  test("arguments of exactly 10,000 elements pass", async () => {
    // The two argument names count as well, so 9,998 ids make 10,000 in all.
    const { client, backend: be } = await connect();
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "at the cap", apps: ids(DEFAULT_MAX_TOOL_INPUT_ELEMENTS - 2) },
    });

    expect((res as ToolResult).isError).toBeFalsy();
    expect(be.searches).toHaveLength(1);
    expect(be.searches[0]!.filters?.apps).toHaveLength(DEFAULT_MAX_TOOL_INPUT_ELEMENTS - 2);
  });

  test("a caller can set a lower cap", async () => {
    const { client, backend: be } = await connect(5);
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "lower cap", apps: ids(4) },
    });

    expect((res as ToolResult).isError).toBe(true);
    expect(text(res)).toContain("more than the maximum of 5 elements");
    expect(be.searches).toHaveLength(0);
  });

  test("Infinity turns the cap off", async () => {
    const { client, backend: be } = await connect(Infinity);
    const res = await client.callTool({
      name: "pipeshub_search",
      arguments: { query: "no cap", apps: ids(DEFAULT_MAX_TOOL_INPUT_ELEMENTS + 1) },
    });

    expect((res as ToolResult).isError).toBeFalsy();
    expect(be.searches).toHaveLength(1);
  });

  test("a cap below 1 is refused when the server is built", () => {
    expect(() => createMCPServer({ logger, chat: false, maxToolInputElements: 0 }))
      .toThrow(RangeError);
  });
});
