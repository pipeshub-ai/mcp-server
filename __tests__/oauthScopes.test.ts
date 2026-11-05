import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { requiredOAuthScopes } from "../src/mcp-server/oauth-scopes.js";
import { createMCPServer, type ToolCallEvent } from "../src/mcp-server/server.js";

const logger = createConsoleLogger("error");

// The scopes these tools require: the server's McpToolScopes less
// offline_access, code:read (the code tools are the server's own),
// config:read (only the model listing in pipeshub_sources uses it, and that
// tool answers without it) and agent:execute (it gates chat's actions and
// agent turns, not whether chat is offered).
const TOOL_SCOPES = [
  "semantic:write", "conversation:chat", "agent:read",
  "kb:read", "kb:write", "kb:upload", "connector:read", "connector:write",
  "connector:sync", "user:read", "team:read", "usergroup:read",
];

async function connect(deps: Omit<Parameters<typeof createMCPServer>[0], "logger"> = {}) {
  const { server } = createMCPServer({
    logger,
    apps: true,
    getSDK: () => new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "pat" },
      httpClient: new HTTPClient({
        fetcher: async () => Response.json({ agents: [], pagination: { hasNext: false } }),
      }),
    }),
    ...deps,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

const listed = async (deps: Parameters<typeof connect>[0] = {}) =>
  (await (await connect(deps)).listTools()).tools.map((t) => t.name);

describe("requiredOAuthScopes", () => {
  test("every tool the server can register has an entry", async () => {
    for (const name of await listed()) {
      expect({ name, scopes: Array.isArray(requiredOAuthScopes(name)) }).toEqual({ name, scopes: true });
    }
    expect(requiredOAuthScopes("not_a_tool")).toBeUndefined();
    expect(requiredOAuthScopes("toString")).toBeUndefined();
  });

  test("the tools together need exactly the scopes a token may be granted for them", async () => {
    const union = new Set((await listed()).flatMap((n) => [...(requiredOAuthScopes(n) ?? [])]));
    expect([...union].sort()).toEqual([...TOOL_SCOPES].sort());
  });
});

describe("grantedOAuthScopes", () => {
  test("unset lists every tool, as before", async () => {
    expect(await listed({ grantedOAuthScopes: undefined })).toEqual(await listed());
  });

  test("lists only the tools whose scopes are all granted", async () => {
    const names = await listed({ grantedOAuthScopes: ["kb:read", "semantic:write", "connector:read"] });
    expect(names).toEqual([
      "pipeshub_sources",
      "pipeshub_search",
      "pipeshub_read_record",
      "pipeshub_browse",
      "pipeshub_resolve_reference",
      "pipeshub_read_thread",
      "pipeshub_download_record",
      "pipeshub_indexing_status",
      "pipeshub_connect_source",
      "pipeshub_show_citations",
      "pipeshub_preview_record",
    ]);
  });

  test("a token that cannot chat gets the instructions without chat", async () => {
    const client = await connect({ grantedOAuthScopes: ["kb:read", "semantic:write", "connector:read", "agent:read"] });
    expect(client.getInstructions()).not.toContain("pipeshub_chat");
    expect((await client.listTools()).tools.map((t) => t.name)).not.toContain("pipeshub_agents");
  });

  test("a token that can chat but not act still gets chat", async () => {
    const names = await listed({ grantedOAuthScopes: ["conversation:chat"] });
    expect(names).toContain("pipeshub_chat");
  });

  test("every scope granted lists every tool", async () => {
    expect(await listed({ grantedOAuthScopes: TOOL_SCOPES })).toEqual(await listed());
  });
});

describe("allowChatActions", () => {
  test("false mounts chat that says it cannot act, and the instructions agree", async () => {
    const client = await connect({ allowChatActions: false });
    const chat = (await client.listTools()).tools.find((t) => t.name === "pipeshub_chat");
    expect(chat?.description).toContain("It cannot act here");
    expect(chat?.annotations?.destructiveHint).toBe(false);
    expect(client.getInstructions()).toContain("It cannot act");
    expect(client.getInstructions()).not.toContain("Actions are on");
  });
});

describe("onToolCall", () => {
  async function observed(onToolCall: (e: ToolCallEvent) => void) {
    return connect({ onToolCall });
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test("reports a success, an error result and a refused call, once each, without values", async () => {
    const events: ToolCallEvent[] = [];
    const client = await observed((e) => void events.push(e));

    await client.callTool({ name: "pipeshub_agents", arguments: { search: "secret words" } });
    await client.callTool({ name: "pipeshub_directory", arguments: { action: "get_user" } });
    await client.callTool({ name: "pipeshub_search", arguments: { query: "q", typo: 1 } });
    await settle();

    expect(events.map(({ durationMs: _d, ...e }) => e)).toEqual([
      { tool: "pipeshub_agents", isError: false, argumentNames: ["search"] },
      { tool: "pipeshub_directory", isError: true, argumentNames: ["action"] },
      { tool: "pipeshub_search", isError: true, argumentNames: ["query", "typo"] },
    ]);
    expect(events.every((e) => e.durationMs >= 0)).toBe(true);
    expect(JSON.stringify(events)).not.toContain("secret words");
  });

  test("an observer that throws or rejects does not touch the call", async () => {
    for (const onToolCall of [
      () => { throw new Error("boom"); },
      () => Promise.reject(new Error("boom")) as unknown as void,
    ]) {
      const client = await observed(onToolCall);
      const r = await client.callTool({ name: "pipeshub_agents", arguments: {} });
      await settle();
      expect(r.isError).toBeFalsy();
    }
  });
});
