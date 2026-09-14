import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import {
  listAllSources,
  resolveSourceScope,
} from "../src/mcp-server/tools/_helpers.js";

const COLL = "11111111-1111-4111-8111-111111111111";
const CONN = "33333333-3333-4333-8333-333333333333";
const UNKNOWN = "55555555-5555-4555-8555-555555555555";

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

describe("resolveSourceScope", () => {
  test("nothing scoped, no lookup", async () => {
    const { client, requested } = listingClient([]);
    const { scope, notes } = await resolveSourceScope(client, undefined, []);
    expect(requested).toEqual([]);
    expect(scope).toEqual({ apps: [], kb: [], movedToKb: [], movedToApps: [] });
    expect(notes).toEqual([]);
  });

  test("a collection id in apps moves to kb and the note names it", async () => {
    const { client } = listingClient([
      { body: { items: [node(COLL, "KB"), node(CONN)], pagination: { hasNext: false } } },
    ]);
    const { scope, notes } = await resolveSourceScope(client, [CONN, COLL], undefined);
    expect(scope).toEqual({ apps: [CONN], kb: [COLL], movedToKb: [COLL], movedToApps: [] });
    expect(notes.join("\n")).toContain(COLL);
  });

  test("a connector id in kb moves to apps and the note names it", async () => {
    const { client } = listingClient([
      { body: { items: [node(COLL, "KB"), node(CONN)], pagination: { hasNext: false } } },
    ]);
    const { scope, notes } = await resolveSourceScope(client, undefined, [CONN, COLL]);
    expect(scope).toEqual({ apps: [CONN], kb: [COLL], movedToKb: [], movedToApps: [CONN] });
    expect(notes.join("\n")).toContain(CONN);
  });

  test("ids in the right lists produce no note", async () => {
    const { client } = listingClient([
      { body: { items: [node(COLL, "KB"), node(CONN)], pagination: { hasNext: false } } },
    ]);
    const { scope, notes } = await resolveSourceScope(client, [CONN], [COLL]);
    expect(scope).toEqual({ apps: [CONN], kb: [COLL], movedToKb: [], movedToApps: [] });
    expect(notes).toEqual([]);
  });

  test("a failed lookup sends the ids unchanged and says why", async () => {
    const { client } = listingClient([
      { status: 500, body: { error: { message: "boom" } } },
    ]);
    const { scope, notes } = await resolveSourceScope(client, [COLL], [CONN]);
    expect(scope).toEqual({ apps: [COLL], kb: [CONN], movedToKb: [], movedToApps: [] });
    expect(notes.join("\n")).toContain("HTTP 500");
  });

  test("an id missing from a truncated listing is named", async () => {
    const { client } = listingClient([
      { body: { items: [node(CONN)], pagination: { hasNext: true } } },
    ]);
    const { notes } = await resolveSourceScope(client, undefined, [UNKNOWN], { maxPages: 1 });
    expect(notes.join("\n")).toContain(UNKNOWN);
  });
});
