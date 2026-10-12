import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import {
  PARTIAL_COVERAGE_NOTE,
  tool$pipeshubSources,
} from "../src/mcp-server/tools/pipeshubSources.js";
import {
  COVERAGE_SOURCE_LIMIT,
  sourceCoverage,
} from "../src/mcp-server/tools/_helpers.js";

// Search and chat find only indexed content. A source that is a quarter
// indexed looked exactly like a fully indexed one, so an agent that searched
// it and found nothing told the user the work did not exist. Each source now
// says how much of it search can see.

const CONN = "33333333-3333-4333-8333-333333333333";
const COLL = "11111111-1111-4111-8111-111111111111";

const STATUSES = [
  "NOT_STARTED", "PAUSED", "IN_PROGRESS", "COMPLETED", "FAILED",
  "FILE_TYPE_NOT_SUPPORTED", "AUTO_INDEX_OFF", "EMPTY",
  "ENABLE_MULTIMODAL_MODELS", "QUEUED",
];

/** The body `GET /connectors/{id}/stats` returns, every status present. */
function statsBody(id: string, counts: Record<string, number>, total?: number) {
  const indexingStatus = Object.fromEntries(
    STATUSES.map((s) => [s, counts[s] ?? 0]),
  );
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    success: true,
    data: {
      orgId: "org-1",
      connectorId: id,
      origin: "CONNECTOR",
      stats: { total: total ?? sum, indexingStatus },
      byRecordType: [],
    },
  };
}

type Reply = { status?: number; body: unknown };

/**
 * A client whose source listing returns `items`, and whose stats route
 * answers `stats[id]` (404 when absent). Records every stats id asked for.
 */
function instance(
  items: Array<{ id: string; name: string; connector: string }>,
  stats: Record<string, Reply>,
) {
  const statsAsked: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL((input as Request).url);
    const m = url.pathname.match(/\/connectors\/([^/]+)\/stats$/);
    if (m) {
      const id = decodeURIComponent(m[1]!);
      statsAsked.push(id);
      const r = stats[id] ?? { status: 404, body: { detail: "not found" } };
      return Response.json(r.body, { status: r.status ?? 200 });
    }
    if (url.pathname.endsWith("/knowledgeBase/knowledge-hub/nodes")) {
      return Response.json({
        items: items.map((i) => ({ ...i, hasChildren: true })),
        pagination: { hasNext: false },
      });
    }
    return Response.json({ models: [] });
  };
  const core = new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({ fetcher }),
  });
  return { core, statsAsked };
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const jsonOf = (r: { content: Array<{ text?: string }> }) =>
  JSON.parse(r.content.map((c) => c.text ?? "").join(""));

describe("sourceCoverage", () => {
  test("indexed versus total, and the rest by status", () => {
    expect(sourceCoverage(statsBody(CONN, {
      COMPLETED: 536, AUTO_INDEX_OFF: 1650, QUEUED: 50, FAILED: 3,
    }))).toEqual({
      indexed: 536,
      total: 2239,
      notIndexed: { AUTO_INDEX_OFF: 1650, QUEUED: 50, FAILED: 3 },
    });
  });

  test("a fully indexed source has nothing under notIndexed", () => {
    expect(sourceCoverage(statsBody(CONN, { COMPLETED: 12 }))).toEqual({
      indexed: 12, total: 12, notIndexed: {},
    });
  });

  test("records with no status are counted, not dropped", () => {
    // The backend adds them to `total` but to no status.
    expect(sourceCoverage(statsBody(CONN, { COMPLETED: 5 }, 8))).toEqual({
      indexed: 5, total: 8, notIndexed: { UNKNOWN: 3 },
    });
  });

  test("a body without the counts is no coverage, not zero", () => {
    expect(sourceCoverage({ items: [] })).toBeUndefined();
    expect(sourceCoverage({ success: true, data: {} })).toBeUndefined();
    expect(sourceCoverage(null)).toBeUndefined();
  });
});

describe("pipeshub_sources coverage", () => {
  test("each source carries its coverage", async () => {
    const { core, statsAsked } = instance(
      [
        { id: CONN, name: "GitHub", connector: "GITHUB" },
        { id: COLL, name: "Handbook", connector: "KB" },
      ],
      {
        [CONN]: { body: statsBody(CONN, { COMPLETED: 536, AUTO_INDEX_OFF: 1703 }) },
        [COLL]: { body: statsBody(COLL, { COMPLETED: 40 }) },
      },
    );

    const body = jsonOf(await tool$pipeshubSources.tool(core, {} as never, ctx()));

    expect(statsAsked.sort()).toEqual([COLL, CONN].sort());
    const byId = Object.fromEntries(
      body.sources.map((s: { id: string }) => [s.id, s]),
    );
    expect(byId[CONN].coverage).toEqual({
      indexed: 536, total: 2239, notIndexed: { AUTO_INDEX_OFF: 1703 },
    });
    expect(byId[COLL].coverage).toEqual({ indexed: 40, total: 40, notIndexed: {} });
    // The listing's own fields are unchanged.
    expect(byId[CONN]).toMatchObject({ id: CONN, kind: "connector", connector: "GITHUB" });
    expect(byId[COLL]).toMatchObject({ id: COLL, kind: "knowledgeBase" });
    expect("notes" in body).toBe(false);
  });

  test("a partly indexed source comes with what a search miss means", async () => {
    const { core } = instance(
      [{ id: CONN, name: "GitHub", connector: "GITHUB" }],
      { [CONN]: { body: statsBody(CONN, { COMPLETED: 536, AUTO_INDEX_OFF: 1703 }) } },
    );

    const body = jsonOf(await tool$pipeshubSources.tool(core, {} as never, ctx()));

    expect(body.coverageNote).toBe(PARTIAL_COVERAGE_NOTE);
    expect(body.coverageNote).toContain("does not mean the thing does not exist");
    expect(body.coverageNote).toContain('mode:"lookup"');
  });

  test("fully indexed sources carry no such note", async () => {
    const { core } = instance(
      [{ id: COLL, name: "Handbook", connector: "KB" }],
      { [COLL]: { body: statsBody(COLL, { COMPLETED: 40 }) } },
    );

    const body = jsonOf(await tool$pipeshubSources.tool(core, {} as never, ctx()));

    expect("coverageNote" in body).toBe(false);
  });

  test("the description names coverage", () => {
    expect(tool$pipeshubSources.description).toContain("`coverage`");
  });

  test("a token that may not read counts still gets every source, with a note", async () => {
    const { core } = instance(
      [{ id: CONN, name: "GitHub", connector: "GITHUB" }],
      { [CONN]: { status: 403, body: { detail: "Insufficient scope" } } },
    );

    const out = await tool$pipeshubSources.tool(core, {} as never, ctx());

    expect(out.isError).toBeUndefined();
    const body = jsonOf(out);
    expect(body.sources).toHaveLength(1);
    expect("coverage" in body.sources[0]).toBe(false);
    expect(body.notes[0]).toContain("connector:read and kb:read");
  });

  test("one unreadable source loses only its own coverage", async () => {
    const { core } = instance(
      [
        { id: CONN, name: "GitHub", connector: "GITHUB" },
        { id: COLL, name: "Handbook", connector: "KB" },
      ],
      {
        [CONN]: { status: 500, body: { detail: "boom" } },
        [COLL]: { body: statsBody(COLL, { COMPLETED: 2 }) },
      },
    );

    const body = jsonOf(await tool$pipeshubSources.tool(core, {} as never, ctx()));

    const byId = Object.fromEntries(
      body.sources.map((s: { id: string }) => [s.id, s]),
    );
    expect("coverage" in byId[CONN]).toBe(false);
    expect(byId[COLL].coverage.indexed).toBe(2);
    expect(body.notes).toEqual(["coverage could not be read for 1 source(s)."]);
  });

  test("counts are fetched for at most the first hundred sources", async () => {
    const items = Array.from({ length: COVERAGE_SOURCE_LIMIT + 5 }, (_, i) => ({
      id: `src-${i}`, name: `S${i}`, connector: "DRIVE",
    }));
    const stats = Object.fromEntries(
      items.map((i) => [i.id, { body: statsBody(i.id, { COMPLETED: 1 }) }]),
    );
    const { core, statsAsked } = instance(items, stats);

    const body = jsonOf(await tool$pipeshubSources.tool(core, {} as never, ctx()));

    expect(statsAsked).toHaveLength(COVERAGE_SOURCE_LIMIT);
    expect(body.sources).toHaveLength(COVERAGE_SOURCE_LIMIT + 5);
    expect(body.notes).toEqual([
      `coverage is shown for the first ${COVERAGE_SOURCE_LIMIT} sources only.`,
    ]);
  });

  test("asking only for models fetches no counts", async () => {
    const { core, statsAsked } = instance(
      [{ id: CONN, name: "GitHub", connector: "GITHUB" }],
      {},
    );

    await tool$pipeshubSources.tool(core, { include: ["llmModels"] } as never, ctx());

    expect(statsAsked).toEqual([]);
  });
});
