import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";

type Seen = { method: string; path: string; query: string; body: unknown };

const SERVERS = {
  instances: [
    {
      _id: "gh-1",
      name: "GitHub",
      typeId: "github",
      scope: "org",
      isAuthenticated: true,
      tools: [
        {
          name: "get_me",
          namespacedName: "mcp_github_get_me",
          description: "Who the user is on GitHub.",
          inputSchema: { type: "object", properties: {} },
          annotations: { title: "Get me", readOnlyHint: true },
          kind: "read",
        },
        {
          name: "create_issue",
          description: "x".repeat(400),
          inputSchema: { type: "object", properties: { title: { type: "string" } } },
          kind: "write",
        },
      ],
      toolsError: null,
    },
    { _id: "jira-1", name: "Jira", typeId: "jira", scope: "org", isAuthenticated: false, tools: [] },
  ],
};

async function connect(
  handler: (req: Request, seen: Seen) => Response | Promise<Response>,
  deps: Omit<Parameters<typeof createMCPServer>[0], "logger" | "getSDK"> = {},
) {
  const seen: Seen[] = [];
  const { server } = createMCPServer({
    logger: createConsoleLogger("error"),
    getSDK: () => new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "pat" },
      httpClient: new HTTPClient({
        fetcher: async (input, init) => {
          const req = new Request(input, init);
          const url = new URL(req.url);
          const text = req.method === "GET" ? "" : await req.text();
          const s = { method: req.method, path: url.pathname, query: url.search, body: text ? JSON.parse(text) : undefined };
          seen.push(s);
          return handler(req, s);
        },
      }),
    }),
    ...deps,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  return { client, seen };
}

const text = (r: any): string => r.content[0].text;

describe("pipeshub_mcp_servers", () => {
  test("lists every server with its sign-in state, and tools without schemas", async () => {
    const { client, seen } = await connect(() => Response.json(SERVERS));
    const r: any = await client.callTool({ name: "pipeshub_mcp_servers", arguments: {} });
    expect(seen[0]).toMatchObject({ method: "GET", path: "/api/v1/mcp-servers/my-mcp-servers", query: "?includeTools=true" });
    const body = JSON.parse(text(r));
    expect(r.structuredContent).toEqual(body);
    expect(body.total).toBe(2);
    expect(body.signInUrl).toBe("http://pipeshub.test/workspace/mcp-servers/personal/");
    const [gh, jira] = body.servers;
    expect(gh).toMatchObject({ instanceId: "gh-1", name: "GitHub", type: "github", scope: "org", signedIn: true });
    expect(gh.tools[0]).toEqual({ name: "get_me", title: "Get me", description: "Who the user is on GitHub.", kind: "read" });
    // A long description is cut when every server is listed.
    expect(gh.tools[1].description.length).toBeLessThanOrEqual(300);
    expect(gh.tools[1].inputSchema).toBeUndefined();
    expect(jira).toEqual({ instanceId: "jira-1", name: "Jira", type: "jira", scope: "org", signedIn: false });
    expect(body.notes.join(" ")).toContain("1 server(s) need the user to sign in");
  });

  test("one server, by name, carries each tool's inputSchema and full description", async () => {
    const { client } = await connect(() => Response.json(SERVERS));
    const r: any = await client.callTool({ name: "pipeshub_mcp_servers", arguments: { server: "git" } });
    const body = JSON.parse(text(r));
    expect(body.servers.map((s: any) => s.instanceId)).toEqual(["gh-1"]);
    expect(body.servers[0].tools[1].inputSchema).toEqual({ type: "object", properties: { title: { type: "string" } } });
    expect(body.servers[0].tools[1].description).toHaveLength(400);
  });

  test("an unknown server says so", async () => {
    const { client } = await connect(() => Response.json(SERVERS));
    const r: any = await client.callTool({ name: "pipeshub_mcp_servers", arguments: { server: "slack" } });
    expect(JSON.parse(text(r)).notes[0]).toContain('No MCP server matches "slack"');
  });

  test("a refused listing is a tool error that names the missing scope", async () => {
    const { client } = await connect(() =>
      Response.json({ message: "Insufficient scope. Required: mcp:read" }, { status: 403, statusText: "Forbidden" })
    );
    const r: any = await client.callTool({ name: "pipeshub_mcp_servers", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("mcp:read");
  });
});

describe("pipeshub_run_mcp_tool", () => {
  test("sends one call and returns the server's own result", async () => {
    const { client, seen } = await connect(() =>
      Response.json({
        ran: true,
        result: { content: [{ type: "text", text: "octocat" }], structuredContent: { login: "octocat" }, isError: false },
      })
    );
    const r: any = await client.callTool({
      name: "pipeshub_run_mcp_tool",
      arguments: { instanceId: "gh-1", tool: "get_me", arguments: { a: 1 } },
    });
    expect(seen).toEqual([{
      method: "POST",
      path: "/api/v1/mcp-servers/instances/gh-1/tools/call",
      query: "",
      body: { tool: "get_me", arguments: { a: 1 } },
    }]);
    expect(r.content).toEqual([{ type: "text", text: "octocat" }]);
    expect(r.structuredContent).toEqual({ login: "octocat" });
    expect(r.isError).toBeUndefined();
  });

  test("the external server's own error stays an error", async () => {
    const { client } = await connect(() =>
      Response.json({ ran: true, result: { content: [{ type: "text", text: "Not Found" }], isError: true } })
    );
    const r: any = await client.callTool({ name: "pipeshub_run_mcp_tool", arguments: { instanceId: "gh-1", tool: "get_me" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toBe("Not Found");
  });

  test("a call the approval rules refuse did not run, and says where to change the rule", async () => {
    const { client } = await connect(() =>
      Response.json({ ran: false, reason: "needs_approval", rule: "ask", message: "create_issue on GitHub needs approval." })
    );
    const r: any = await client.callTool({
      name: "pipeshub_run_mcp_tool",
      arguments: { instanceId: "gh-1", tool: "create_issue", arguments: { title: "t" } },
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toBe(
      "Not run: create_issue on GitHub needs approval. Tool approval rules: http://pipeshub.test/workspace/mcp-servers/personal/",
    );
  });

  test("a 404 or 409 passes PipesHub's reason on", async () => {
    const { client } = await connect(() =>
      Response.json({ detail: "GitHub has no tool named get_you. List its tools for the exact name." }, { status: 404 })
    );
    const r: any = await client.callTool({ name: "pipeshub_run_mcp_tool", arguments: { instanceId: "gh-1", tool: "get_you" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("GitHub has no tool named get_you");
  });

  test("reads the reason from the gateway's error envelope too", async () => {
    const { client } = await connect(() =>
      Response.json(
        { error: { code: "HTTP_CONFLICT", message: "Not signed in to Jira. Sign in to it in PipesHub first." } },
        { status: 409 },
      )
    );
    const r: any = await client.callTool({ name: "pipeshub_run_mcp_tool", arguments: { instanceId: "jira-1", tool: "x" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toBe("x on MCP server jira-1 failed (HTTP 409). Not signed in to Jira. Sign in to it in PipesHub first.");
  });

  test("is left out when the host turns actions off, or the server is read-only", async () => {
    for (const deps of [{ allowChatActions: false }, { scopes: ["read" as const] }]) {
      const { client } = await connect(() => Response.json({}), deps);
      const names = (await client.listTools()).tools.map((t) => t.name);
      expect(names).toContain("pipeshub_mcp_servers");
      expect(names).not.toContain("pipeshub_run_mcp_tool");
    }
  });

  test("a token without agent:execute is not offered it; one without mcp:read is not offered the list", async () => {
    const { client } = await connect(() => Response.json({}), { grantedOAuthScopes: ["mcp:read"] });
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("pipeshub_mcp_servers");
    expect(names).not.toContain("pipeshub_run_mcp_tool");
    const { client: other } = await connect(() => Response.json({}), { grantedOAuthScopes: ["agent:execute"] });
    const otherNames = (await other.listTools()).tools.map((t) => t.name);
    expect(otherNames).toContain("pipeshub_run_mcp_tool");
    expect(otherNames).not.toContain("pipeshub_mcp_servers");
  });
});
