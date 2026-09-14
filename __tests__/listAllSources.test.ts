import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import {
  listAllSources,
} from "../src/mcp-server/tools/_helpers.js";

const COLL = "11111111-1111-4111-8111-111111111111";
const CONN = "33333333-3333-4333-8333-333333333333";

type Page = { status?: number; body: unknown };

/** A client whose listing endpoint serves `pages[page - 1]`. */
function listingClient(pages: Page[]) {
  const requested: number[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL((input as Request).url);
    const page = Number(url.searchParams.get("page"));
    requested.push(page);
    const p = pages[page - 1] ?? { body: { items: [] } };
    return Response.json(p.body, { status: p.status ?? 200 });
  };
  const client = new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "test" },
    httpClient: new HTTPClient({ fetcher }),
  });
  return { client, requested };
}

const node = (id: string, connector = "JIRA") => ({
  id,
  name: id,
  connector,
  hasChildren: false,
});
const nodes = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => node(`${prefix}-${i}`));

// The tool used to read page 1 with limit 200 and ignore `hasNext`, so an org
// with more sources lost the rest without a warning.
describe("listAllSources", () => {
  test("follows hasNext to the last page", async () => {
    const { client, requested } = listingClient([
      { body: { items: [node(CONN)], pagination: { hasNext: true } } },
      { body: { items: [node(COLL, "KB")], pagination: { hasNext: false } } },
    ]);
    const listed = await listAllSources(client);
    expect(requested).toEqual([1, 2]);
    expect(listed.ok && listed.sources.map((s) => [s.id, s.kind]))
      .toEqual([[CONN, "connector"], [COLL, "knowledgeBase"]]);
    expect(listed.ok && listed.truncated).toBe(false);
  });

  test("without pagination, a full page asks for the next one", async () => {
    const { client, requested } = listingClient([
      { body: { items: nodes(200, "a") } },
      { body: { items: nodes(3, "b") } },
    ]);
    const listed = await listAllSources(client);
    expect(requested).toEqual([1, 2]);
    expect(listed.ok && listed.sources.length).toBe(203);
  });

  test("without pagination, a short page is the last one", async () => {
    const { client, requested } = listingClient([
      { body: { items: nodes(3, "a") } },
    ]);
    await listAllSources(client);
    expect(requested).toEqual([1]);
  });

  test("an empty page stops the loop even if hasNext says more", async () => {
    const { client, requested } = listingClient([
      { body: { items: [], pagination: { hasNext: true } } },
    ]);
    const listed = await listAllSources(client);
    expect(requested).toEqual([1]);
    expect(listed.ok && listed.truncated).toBe(false);
  });

  test("the page cap marks the listing truncated", async () => {
    const more = { body: { items: [node(CONN)], pagination: { hasNext: true } } };
    const { client, requested } = listingClient([more, more, more]);
    const listed = await listAllSources(client, { maxPages: 2 });
    expect(requested).toEqual([1, 2]);
    expect(listed.ok && listed.truncated).toBe(true);
  });

  test("a failed later page fails the listing, not a partial list", async () => {
    const { client } = listingClient([
      { body: { items: [node(CONN)], pagination: { hasNext: true } } },
      { status: 500, body: { error: { message: "boom" } } },
    ]);
    const listed = await listAllSources(client);
    expect(listed.ok).toBe(false);
    if (listed.ok) return;
    expect(listed.reason).toBe("HTTP 500");
  });
});
