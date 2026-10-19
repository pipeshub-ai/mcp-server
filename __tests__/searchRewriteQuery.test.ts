import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";

// An agent writes its own search queries, so the tool asks PipesHub to search
// them as written instead of having a model rewrite and expand each one (two
// model calls, about 4 s, on every search).

function client() {
  const sent: any[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const req = input as Request;
    sent.push({ path: new URL(req.url).pathname, body: JSON.parse(await req.text()) });
    return Response.json({ searchId: "s1", searchResponse: { searchResults: [], records: [] } });
  };
  return {
    sent,
    core: new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    }),
  };
}

const ctx = () => ({ signal: new AbortController().signal }) as never;

describe("pipeshub_search turns off the server's query rewrite", () => {
  test("every search asks for the query as written", async () => {
    const { core, sent } = client();
    await tool$pipeshubSearch.tool(core, { query: "billing retry policy" } as never, ctx());
    await tool$pipeshubSearch.tool(core, {
      query: "release notes",
      limit: 5,
      modifiedAfter: "2026-09-01",
    } as never, ctx());

    expect(sent.map((s) => s.path)).toEqual(["/api/v1/search", "/api/v1/search"]);
    expect(sent[0].body).toEqual({ query: "billing retry policy", limit: 10, rewriteQuery: false });
    expect(sent[1].body).toEqual({
      query: "release notes",
      limit: 5,
      modifiedAfter: "2026-09-01",
      rewriteQuery: false,
    });
  });

  test("it is not an argument the agent can set", () => {
    expect(Object.keys(tool$pipeshubSearch.args)).not.toContain("rewriteQuery");
  });
});
