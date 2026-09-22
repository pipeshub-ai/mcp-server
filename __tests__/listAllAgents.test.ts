import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { listAllAgents } from "../src/mcp-server/tools/_helpers.js";

// Paging is where a listing quietly loses rows: stop a page early and the org's
// remaining agents simply are not there, with nothing saying so. `listAllSources`
// is covered; this one was not, and it has three behaviours that one does not --
// two spellings of the "more pages" flag, two of the total, and an envelope that
// can report failure with HTTP 200.

type Page = { status?: number; body: unknown };

/** A client whose `/agents` endpoint serves `pages[page - 1]`. */
function listingClient(pages: Page[]) {
  const requested: number[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL((input as Request).url);
    const page = Number(url.searchParams.get("page"));
    requested.push(page);
    const p = pages[page - 1] ?? { body: { agents: [] } };
    return Response.json(p.body, { status: p.status ?? 200 });
  };
  const client = new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "test" },
    httpClient: new HTTPClient({ fetcher }),
  });
  return { client, requested };
}

const agent = (key: string) => ({ _key: key, name: key });
const agents = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => agent(`${prefix}-${i}`));

const names = (r: { agents: Array<{ _key: string }> }) => r.agents.map((a) => a._key);

describe("listAllAgents", () => {
  test("follows hasNext to the last page", async () => {
    const { client, requested } = listingClient([
      { body: { agents: agents(2, "a"), pagination: { hasNext: true, totalItems: 3 } } },
      { body: { agents: [agent("b-0")], pagination: { hasNext: false, totalItems: 3 } } },
    ]);

    const out = await listAllAgents(client);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(names(out)).toEqual(["a-0", "a-1", "b-0"]);
    expect(out.total).toBe(3);
    expect(out.truncated).toBe(false);
    expect(requested).toEqual([1, 2]);
  });

  test("hasNextPage is read as well as hasNext", async () => {
    // The endpoint has shipped both spellings. Honouring only one means the
    // listing stops at page 1 against a server that uses the other.
    const { client, requested } = listingClient([
      { body: { agents: agents(2, "a"), pagination: { hasNextPage: true } } },
      { body: { agents: [agent("b-0")], pagination: { hasNextPage: false } } },
    ]);

    const out = await listAllAgents(client);

    expect(out.ok && names(out)).toEqual(["a-0", "a-1", "b-0"]);
    expect(requested).toEqual([1, 2]);
  });

  test("without pagination, a full page asks for the next one", async () => {
    const { client, requested } = listingClient([
      { body: { agents: agents(200, "a") } },
      { body: { agents: [agent("b-0")] } },
    ]);

    const out = await listAllAgents(client);

    expect(out.ok && out.agents.length).toBe(201);
    expect(requested).toEqual([1, 2]);
  });

  test("without pagination, a short page is the last one", async () => {
    const { client, requested } = listingClient([{ body: { agents: agents(3, "a") } }]);

    const out = await listAllAgents(client);

    expect(out.ok && out.agents.length).toBe(3);
    expect(requested).toEqual([1]);
  });

  test("an empty page stops the loop even if hasNext says more", async () => {
    // Otherwise a server that always says "more" and never sends any is 25
    // round trips before the cap ends it.
    const { client, requested } = listingClient([
      { body: { agents: agents(2, "a"), pagination: { hasNext: true } } },
      { body: { agents: [], pagination: { hasNext: true } } },
    ]);

    const out = await listAllAgents(client);

    expect(out.ok && out.truncated).toBe(false);
    expect(requested).toEqual([1, 2]);
  });

  test("the page cap marks the listing truncated", async () => {
    // Truncated is the honest answer. Reporting a short list as complete is
    // how an agent concludes an agent does not exist.
    const { client, requested } = listingClient(
      Array.from({ length: 4 }, () => ({
        body: { agents: agents(2, "a"), pagination: { hasNext: true } },
      })),
    );

    const out = await listAllAgents(client, { maxPages: 3 });

    expect(out.ok && out.truncated).toBe(true);
    expect(out.ok && out.agents.length).toBe(6);
    expect(requested).toEqual([1, 2, 3]);
  });

  test("total falls back from totalItems to total to what arrived", async () => {
    for (const [pagination, expected] of [
      [{ totalItems: 9, total: 4, hasNext: false }, 9],
      [{ total: 4, hasNext: false }, 4],
      [{ hasNext: false }, 2],
    ] as const) {
      const { client } = listingClient([{ body: { agents: agents(2, "a"), pagination } }]);
      const out = await listAllAgents(client);
      expect(out.ok && out.total).toBe(expected);
    }
  });

  test("a failed later page fails the listing, not a partial list", async () => {
    // Half an agent list presented as the whole one is worse than an error:
    // the caller reports that an agent does not exist.
    const { client } = listingClient([
      { body: { agents: agents(2, "a"), pagination: { hasNext: true } } },
      { status: 500, body: { message: "boom" } },
    ]);

    const out = await listAllAgents(client);

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.result.isError).toBe(true);
    expect(out.result.content.map((c) => c.text ?? "").join("")).toContain("HTTP 500");
  });

  test("an envelope that reports failure is a failure, whatever the status", async () => {
    // HTTP 200 with `success: false` is still the server declining to answer.
    const { client } = listingClient([{ body: { success: false, agents: [] } }]);

    const out = await listAllAgents(client);

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.result.content.map((c) => c.text ?? "").join("")).toContain("success: false");
  });

  test("the search term reaches the server", async () => {
    let seen: string | null = null;
    const fetcher = async (input: RequestInfo | URL) => {
      seen = new URL((input as Request).url).searchParams.get("search");
      return Response.json({ agents: [], pagination: { hasNext: false } });
    };
    const client = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "test" },
      httpClient: new HTTPClient({ fetcher }),
    });

    await listAllAgents(client, { search: "support" });

    expect(seen).toBe("support");
  });
});
