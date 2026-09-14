import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

// The backend drops a collection id from `apps` (arango_http_provider.py:
// 19213-19217) and a connector id from `kb`, so a chat scoped with an id in
// the wrong list answered from nothing. Each id is sent in the list its kind
// belongs to.

const COLL = "11111111-1111-4111-8111-111111111111";
const CONN = "33333333-3333-4333-8333-333333333333";

function chatClient() {
  const seen: Array<{ method: string; path: string; body: any }> = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    const text = req.method === "GET" ? "" : await req.clone().text();
    seen.push({ method: req.method, path, body: text ? JSON.parse(text) : undefined });
    if (path.endsWith("/knowledge-hub/nodes")) {
      return Response.json({
        items: [
          { id: COLL, name: "HR", connector: "KB", hasChildren: true },
          { id: CONN, name: "Jira", connector: "JIRA", hasChildren: true },
        ],
        pagination: { hasNext: false },
      });
    }
    // An empty stream: the tool reports an error, but the request is recorded.
    return new Response("", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
  const client = new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "test" },
    httpClient: new HTTPClient({ fetcher }),
  });
  const run = (args: Record<string, unknown>) =>
    tool$pipeshubChat.tool(client, args as any, { signal: undefined } as any);
  return {
    run,
    listed: () => seen.some((s) => s.path.endsWith("/knowledge-hub/nodes")),
    sentFilters: () => seen.find((s) => s.method === "POST")?.body?.filters,
  };
}

describe("pipeshub_chat source scoping", () => {
  test("a collection id in apps is sent as kb", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { apps: [COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [], kb: [COLL] });
  });

  test("a connector id in kb is sent as apps", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { kb: [CONN] } });
    expect(c.sentFilters()).toEqual({ apps: [CONN], kb: [] });
  });

  test("ids in the right lists are sent unchanged", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { apps: [CONN], kb: [COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [CONN], kb: [COLL] });
  });

  test("a connector stays in apps when a collection moves out", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { apps: [CONN, COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [CONN], kb: [COLL] });
  });

  // On agent chat a missing key falls back to the agent's own sources
  // (agent.py:3632-3643), so both lists go out to keep "only these".
  test("agent chat routes the same way and sends both lists", async () => {
    const c = chatClient();
    await c.run({ query: "q", agentId: "agent-1", filters: { apps: [COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [], kb: [COLL] });
  });

  test("a follow-up turn sends no filters and skips the lookup", async () => {
    const c = chatClient();
    await c.run({ query: "q", conversationId: "conv-1", filters: { apps: [COLL] } });
    expect(c.listed()).toBe(false);
    expect(c.sentFilters()).toBeUndefined();
  });

  test("no filters, no lookup", async () => {
    const c = chatClient();
    await c.run({ query: "q" });
    expect(c.listed()).toBe(false);
    expect(c.sentFilters()).toBeUndefined();
  });

  // `{ apps: [], kb: [] }` on agent chat means no knowledge sources, so an
  // explicit empty scope must reach the server as the caller wrote it.
  test("explicit empty lists pass through unchanged", async () => {
    const c = chatClient();
    await c.run({ query: "q", agentId: "agent-1", filters: { apps: [], kb: [] } });
    expect(c.listed()).toBe(false);
    expect(c.sentFilters()).toEqual({ apps: [], kb: [] });
  });
});
