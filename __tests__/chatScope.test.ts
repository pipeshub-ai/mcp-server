import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

// Ids are sent where the caller put them: connector ids in `apps`, collection
// ids in `kb`. The tool never looks ids up or moves them.

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
  test("apps and kb are sent as given, with the missing key as []", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { apps: [CONN] } });
    expect(c.listed()).toBe(false);
    expect(c.sentFilters()).toEqual({ apps: [CONN], kb: [] });
  });

  test("a collection id in kb stays in kb", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { kb: [COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [], kb: [COLL] });
  });

  test("an id is never moved between apps and kb", async () => {
    const c = chatClient();
    await c.run({ query: "q", filters: { apps: [COLL], kb: [CONN] } });
    expect(c.listed()).toBe(false);
    expect(c.sentFilters()).toEqual({ apps: [COLL], kb: [CONN] });
  });

  // On agent chat a missing key falls back to the agent's own sources
  // (agent.py:3632-3643), so both lists go out to keep "only these".
  test("agent chat sends both lists", async () => {
    const c = chatClient();
    await c.run({ query: "q", agentId: "agent-1", filters: { kb: [COLL] } });
    expect(c.sentFilters()).toEqual({ apps: [], kb: [COLL] });
  });

  test("a follow-up turn sends no filters", async () => {
    const c = chatClient();
    await c.run({ query: "q", conversationId: "conv-1", filters: { apps: [CONN] } });
    expect(c.sentFilters()).toBeUndefined();
  });

  test("no filters sends none", async () => {
    const c = chatClient();
    await c.run({ query: "q" });
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
