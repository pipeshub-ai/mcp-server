import { describe, expect, test } from "bun:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";

// Connectors, collections and agents are listed as resources a person can
// attach; reading one tells the model what to do with its id.

const COLL = "11111111-1111-4111-8111-111111111111";
const CONN = "33333333-3333-4333-8333-333333333333";

const AGENT = "a-1";

async function connect(grantedOAuthScopes?: string[], opts: { chat?: boolean; agentsFail?: boolean; sourcesFail?: boolean } = {}) {
  const fetcher = async (input: RequestInfo | URL) => {
    const path = new URL((input as Request).url).pathname;
    if (path.endsWith("/agents")) {
      if (opts.agentsFail) return new Response("boom", { status: 500 });
      return Response.json({
        agents: [
          { _key: AGENT, name: "Support", tags: [], toolsets: [], knowledge: [] },
          { _key: "a-off", name: "Retired", isActive: false, tags: [], toolsets: [], knowledge: [] },
        ],
        pagination: { hasNext: false, totalItems: 2 },
      });
    }
    if (path.endsWith("/knowledge-hub/nodes")) {
      if (opts.sourcesFail) return new Response("boom", { status: 500 });
      return Response.json({
        items: [
          { id: COLL, name: "HR", connector: "KB", hasChildren: true },
          { id: CONN, name: "Jira", connector: "JIRA", hasChildren: true },
        ],
        pagination: { hasNext: false },
      });
    }
    return new Response("not found", { status: 404 });
  };
  const { server } = createMCPServer({
    logger: createConsoleLogger("error"),
    grantedOAuthScopes,
    chat: opts.chat ?? true,
    getSDK: () => new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    }),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

describe("source resources", () => {
  test("lists connectors, then collections, then active agents, each name led by its group", async () => {
    const { resources } = await (await connect()).listResources();
    const ours = resources.filter((r) => r.uri.startsWith("pipeshub://"));
    expect(ours.map((r) => [r.uri, r.name])).toEqual([
      [`pipeshub://source/apps/${CONN}`, "Connector · Jira (JIRA)"],
      [`pipeshub://source/kb/${COLL}`, "Collection · HR"],
      [`pipeshub://agent/${AGENT}`, "Agent · Support"],
    ]);
  });

  test("reading an agent tells the model to route the question to it", async () => {
    const out = await (await connect()).readResource({ uri: `pipeshub://agent/${AGENT}` });
    const text = (out.contents[0] as { text: string }).text;
    expect(text).toContain(`agentId: "${AGENT}"`);
    expect(text).toContain("pipeshub_chat");
    await expect((await connect()).readResource({ uri: "pipeshub://agent/a-off" })).rejects.toThrow();
  });

  test("without chat, or when the agent list fails, the sources still list and no agent does", async () => {
    for (const client of [await connect(undefined, { chat: false }), await connect(undefined, { agentsFail: true })]) {
      const uris = (await client.listResources()).resources.map((r) => r.uri);
      expect(uris).toContain(`pipeshub://source/apps/${CONN}`);
      expect(uris.some((u) => u.startsWith("pipeshub://agent/"))).toBe(false);
    }
  });

  test("when the source list fails, the agents still list", async () => {
    const uris = (await (await connect(undefined, { sourcesFail: true })).listResources()).resources.map((r) => r.uri);
    expect(uris).toContain(`pipeshub://agent/${AGENT}`);
    expect(uris.some((u) => u.startsWith("pipeshub://source/"))).toBe(false);
  });

  test("reading one names the search argument and the id", async () => {
    const out = await (await connect()).readResource({ uri: `pipeshub://source/apps/${CONN}` });
    const text = (out.contents[0] as { text: string }).text;
    expect(text).toContain(`include "${CONN}" in \`apps\``);
    expect(text).toContain("pipeshub_search");
  });

  test("an unknown id, or one under the wrong argument, is refused", async () => {
    const client = await connect();
    await expect(client.readResource({ uri: "pipeshub://source/apps/nope" })).rejects.toThrow();
    await expect(client.readResource({ uri: `pipeshub://source/kb/${CONN}` })).rejects.toThrow();
  });

  test("a token that cannot list sources gets no source resources", async () => {
    const { resources } = await (await connect(["semantic:write"])).listResources();
    expect(resources.some((r) => r.uri.startsWith("pipeshub://source/"))).toBe(false);
  });
});
