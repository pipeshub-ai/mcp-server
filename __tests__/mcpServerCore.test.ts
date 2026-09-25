import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../src/core.js";
import { RequestIDHook } from "../src/hooks/requestid.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import type { MCPScope } from "../src/mcp-server/scopes.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { createRegisterTool, type ToolDefinition } from "../src/mcp-server/tools.js";

// The MCP server core decides which tools a client can see, validates what it
// sends, turns failures into tool errors rather than protocol errors, and
// stamps every backend call with a trace id. These tests drive a real server
// over an in-memory MCP connection; only the backend's fetch is faked.

const logger = createConsoleLogger("error");

const CURATED = [
  "pipeshub_sources",
  "pipeshub_chat",
  "pipeshub_search",
  "pipeshub_download_record",
  "pipeshub_get_record_content",
  "pipeshub_directory",
  "pipeshub_agents",
];

const jwt = (claims: Record<string, unknown>): string =>
  ["h", Buffer.from(JSON.stringify(claims)).toString("base64url"), "s"].join(".");

/** A fake backend whose `/agents` listing has `pages` pages. */
function backend(pages = 1) {
  const requestIds: string[] = [];
  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const req = input as Request;
    requestIds.push(req.headers.get("x-request-id") ?? "");
    // Yield so concurrent tool calls interleave their backend requests.
    await new Promise((r) => setImmediate(r));
    const page = Number(new URL(req.url).searchParams.get("page") || "1");
    return Response.json({
      agents: [{ _key: `agent-${page}`, name: `Agent ${page}` }],
      pagination: { hasNext: page < pages, totalItems: pages },
    });
  };
  return { fetcher, requestIds };
}

async function connect(
  opts: Parameters<typeof createMCPServer>[0] extends infer D
    ? Omit<D, "logger"> & { bearer?: string; pages?: number }
    : never = {},
) {
  const be = backend(opts.pages);
  const { bearer = "pat", pages: _pages, ...deps } = opts;
  const { server } = createMCPServer({
    logger,
    getSDK: () =>
      new PipeshubCore({
        serverURL: "http://pipeshub.test/api/v1",
        security: { bearerAuth: bearer },
        httpClient: new HTTPClient({ fetcher: be.fetcher }),
      }),
    ...deps,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return { client, backend: be };
}

const text = (res: unknown): string =>
  ((res as { content: Array<{ type: string; text?: string }> }).content)
    .map((c) => c.text ?? "")
    .join("\n");

describe("createMCPServer tool registration", () => {
  test("registers the curated tools in their discovery order", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(CURATED);
  });

  test("an allow-list exposes only the named tools", async () => {
    const { client } = await connect({ allowedTools: ["pipeshub_search", "pipeshub_agents"] });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["pipeshub_search", "pipeshub_agents"]);
  });

  test("the read scope keeps every curated tool", async () => {
    const { client } = await connect({ scopes: ["read"] });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(CURATED);
  });

  test("without getSDK, tools call the configured server with the configured credential", async () => {
    // This is the `start` path: no getSDK, security and serverURL from flags.
    const seen: Array<{ path: string; auth: string | null }> = [];
    const api = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(req) {
        seen.push({ path: new URL(req.url).pathname, auth: req.headers.get("authorization") });
        return Response.json({ agents: [], pagination: { hasNext: false } });
      },
    });
    try {
      const { server } = createMCPServer({
        logger,
        serverURL: `http://127.0.0.1:${api.port}/api/v1`,
        security: { bearerAuth: "operator-pat" },
      });
      const [c, s] = InMemoryTransport.createLinkedPair();
      await server.connect(s);
      const client = new Client({ name: "test", version: "0" });
      await client.connect(c);

      const res = await client.callTool({ name: "pipeshub_agents", arguments: {} });

      expect(res.isError).toBeFalsy();
      expect(seen).toEqual([{ path: "/api/v1/agents", auth: "Bearer operator-pat" }]);
    } finally {
      api.stop(true);
    }
  });

  test("a tool's arguments are validated before it runs", async () => {
    const { client, backend: be } = await connect();
    const res = await client.callTool({ name: "pipeshub_agents", arguments: { search: 5 } });
    expect(res.isError).toBe(true);
    expect(be.requestIds).toEqual([]);
  });
});

describe("createRegisterTool scope filtering", () => {
  const def = (name: string, scopes?: string[]): ToolDefinition => ({
    name,
    description: name,
    ...(scopes ? { scopes: scopes as MCPScope[] } : {}),
    annotations: {
      title: name,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      readOnlyHint: true,
    },
    tool: () => ({ content: [] }),
  });
  const register = (allowed: string[]) => {
    const server = new McpServer({ name: "t", version: "0" });
    const sdk = () => {
      throw new Error("not called");
    };
    const [tool, tools] = createRegisterTool(logger, server, sdk, new Set(allowed as MCPScope[]));
    tool(def("unscoped"));
    tool(def("read-only", ["read"]));
    tool(def("read-write", ["read", "write"]));
    return tools.map((t) => t.name);
  };

  test("with no scope filter every tool is registered", () => {
    expect(register([])).toEqual(["unscoped", "read-only", "read-write"]);
  });

  test("with a scope filter, unscoped tools and tools needing other scopes are dropped", () => {
    // A tool that declares no scope is not assumed safe under a filter.
    expect(register(["read"])).toEqual(["read-only"]);
  });
});

describe("dynamic mode", () => {
  test("exposes only the meta-tools", async () => {
    const { client } = await connect({ dynamic: true });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["describe_tool_input", "execute_tool", "list_scopes", "list_tools"],
    );
  });

  test("list_tools lists every tool and filters by case-insensitive term", async () => {
    const { client } = await connect({ dynamic: true });

    const all = JSON.parse(text(await client.callTool({ name: "list_tools", arguments: {} })));
    expect(all.map((t: { name: string }) => t.name)).toEqual(CURATED);

    const some = JSON.parse(text(await client.callTool({
      name: "list_tools",
      arguments: { search_terms: ["DOWNLOAD_RECORD"] },
    })));
    expect(some.map((t: { name: string }) => t.name)).toContain("pipeshub_download_record");
    expect(some.length).toBeLessThan(CURATED.length);

    const none = JSON.parse(text(await client.callTool({
      name: "list_tools",
      arguments: { search_terms: ["zzz-no-such-term"] },
    })));
    expect(none).toEqual([]);
  });

  test("describe_tool_input returns schemas and names the unknown tools", async () => {
    const { client } = await connect({ dynamic: true });

    const out = text(await client.callTool({
      name: "describe_tool_input",
      arguments: { tool_names: ["pipeshub_agents", "nope"] },
    }));
    expect(out).toContain(`<input_schema tool="pipeshub_agents">`);
    expect(JSON.parse(out.split("\n\n")[1]!).properties).toHaveProperty("search");
    expect(out).toContain("Unknown tools: nope");

    const empty = text(await client.callTool({
      name: "describe_tool_input",
      arguments: { tool_names: [] },
    }));
    expect(empty).toBe("No tool names provided.");
  });

  test("execute_tool runs a tool with validated input", async () => {
    const { client, backend: be } = await connect({ dynamic: true });
    const res = await client.callTool({
      name: "execute_tool",
      arguments: { tool_name: "pipeshub_agents", input: {} },
    });

    expect(res.isError).toBeFalsy();
    expect(JSON.parse(text(res)).agents[0].agentId).toBe("agent-1");
    expect(be.requestIds).toHaveLength(1);
  });

  test("execute_tool rejects an unknown tool and bad input without calling the backend", async () => {
    const { client, backend: be } = await connect({ dynamic: true });

    const unknown = await client.callTool({
      name: "execute_tool",
      arguments: { tool_name: "nope", input: {} },
    });
    expect(unknown.isError).toBe(true);
    expect(text(unknown)).toBe("Unknown tool: nope");

    const invalid = await client.callTool({
      name: "execute_tool",
      arguments: { tool_name: "pipeshub_agents", input: { search: 5 } },
    });
    expect(invalid.isError).toBe(true);
    expect(text(invalid)).toContain("Invalid input for tool pipeshub_agents");
    expect(be.requestIds).toEqual([]);
  });

  test("execute_tool reports a thrown error as a tool error", async () => {
    const { server } = createMCPServer({
      logger,
      dynamic: true,
      getSDK: () => {
        throw new Error("no credential configured");
      },
    });
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    const client = new Client({ name: "test", version: "0" });
    await client.connect(c);

    const res = await client.callTool({
      name: "execute_tool",
      arguments: { tool_name: "pipeshub_agents", input: {} },
    });
    expect(res.isError).toBe(true);
    expect(text(res)).toBe("Error executing tool pipeshub_agents: no credential configured");
  });

  test("list_scopes lists the server's scopes", async () => {
    const { client } = await connect({ dynamic: true });
    expect(text(await client.callTool({ name: "list_scopes", arguments: {} }))).toBe("- read");
  });
});

describe("x-request-id tracing", () => {
  test("a header that is already set is left alone", () => {
    const req = new Request("http://x.test", { headers: { "x-request-id": "caller-id" } });
    const out = new RequestIDHook().beforeRequest({} as never, req);
    expect(out.headers.get("x-request-id")).toBe("caller-id");
  });

  test("every backend call in one tool call shares an id, and each tool call gets a new one", async () => {
    const { client, backend: be } = await connect({ pages: 2 });

    await client.callTool({ name: "pipeshub_agents", arguments: {} });
    await client.callTool({ name: "pipeshub_agents", arguments: {} });

    const [a1, a2, b1, b2] = be.requestIds;
    expect(be.requestIds).toHaveLength(4);
    expect(a1).toMatch(/^mcp-[\w-]+$/);
    expect(a2).toBe(a1!);
    expect(b2).toBe(b1!);
    expect(b1).not.toBe(a1!);
  });

  test("concurrent tool calls keep their own ids", async () => {
    const { client, backend: be } = await connect({ pages: 2 });

    await Promise.all([
      client.callTool({ name: "pipeshub_agents", arguments: {} }),
      client.callTool({ name: "pipeshub_agents", arguments: {} }),
    ]);

    // Each id is used for exactly the two pages of one call, whatever the order.
    const counts = new Map<string, number>();
    for (const id of be.requestIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect([...counts.values()]).toEqual([2, 2]);
  });

  test("the id carries the caller's userId when the bearer is a JWT that has one", async () => {
    const { client, backend: be } = await connect({ bearer: jwt({ userId: "u-42" }) });
    await client.callTool({ name: "pipeshub_agents", arguments: {} });
    expect(be.requestIds[0]).toMatch(/^mcp-u-42-[\w-]+$/);
  });

  test("an opaque token gets an id without a userId", async () => {
    const { client, backend: be } = await connect({ bearer: "not-a-jwt" });
    await client.callTool({ name: "pipeshub_agents", arguments: {} });
    expect(be.requestIds[0]).toMatch(/^mcp-[\w-]+$/);
    expect(be.requestIds[0]).not.toContain("undefined");
  });
});
