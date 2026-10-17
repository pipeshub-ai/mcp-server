import { beforeEach, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";
import {
  forgetSearches,
  groupSearchResults,
  LINKS_PER_RECORD,
  linkLines,
  pageSearchRecords,
  parentFromLocation,
  SEARCH_RESULT_MAX_CHARS,
} from "../src/mcp-server/tools/_searchResults.js";

// A search for ten records used to return one hit per passage. A match inside
// a thread or a pull request brought back every passage of it, so the median
// result was over 100,000 characters and many were saved to a file by the
// client instead of being read. The tool now returns one entry per record,
// with its best few passages, and keeps each result under a size budget.

beforeEach(() => forgetSearches());

function hit(recordId: string, text: string, score: number, extra: Record<string, unknown> = {}) {
  return { content: text, score, ...extra, metadata: { recordId, recordName: recordId } };
}

/** A client that answers every search with the next body, and counts calls. */
function client(bodies: unknown[], token = "t") {
  let calls = 0;
  const fetcher = async (input: RequestInfo | URL) => {
    const url = (input as Request).url;
    if (!url.endsWith("/search")) return Response.json({});
    const body = bodies[Math.min(calls, bodies.length - 1)];
    calls++;
    return Response.json(body);
  };
  return {
    searches: () => calls,
    core: new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: token },
      httpClient: new HTTPClient({ fetcher }),
    }),
  };
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const jsonOf = (r: { content: Array<{ text?: string }> }) =>
  JSON.parse(r.content.map((c) => c.text ?? "").join(""));

describe("one entry per record", () => {
  test("a record's best passages come first, nearest the match on a tie", () => {
    // A thread expanded around message 20: every message has the thread's
    // score, and the server marks how far each one is from the match.
    const thread = Array.from({ length: 6 }, (_, i) =>
      hit("thread", `message ${18 + i}`, 0.8, { distanceFromMatch: Math.abs(i - 2) }));
    const [entry] = groupSearchResults(thread, [], { thread: 30 });

    expect(entry!.passages.map((p) => p.text)).toEqual(["message 20", "message 19", "message 21"]);
    // Shown or not, every passage the search found is counted, including the
    // ones the server left out.
    expect(entry!.passagesFound).toBe(36);
  });

  test("a passage that matched comes before a better-scoring neighbour of another match", () => {
    const [entry] = groupSearchResults([
      hit("pr", "context around the strong match", 0.9, { distanceFromMatch: 1 }),
      hit("pr", "the strong match", 0.9, { distanceFromMatch: 0 }),
      hit("pr", "a weaker match", 0.4, { distanceFromMatch: 0 }),
    ], []);

    expect(entry!.passages.map((p) => p.text)).toEqual([
      "the strong match", "a weaker match", "context around the strong match",
    ]);
  });

  test("records keep the order of their best passage, and repeated text is shown once", () => {
    const entries = groupSearchResults(
      [hit("a", "same", 0.9), hit("b", "other", 0.7), hit("a", "same", 0.6), hit("a", "more", 0.5)],
      [],
    );

    expect(entries.map((e) => e.recordId)).toEqual(["a", "b"]);
    expect(entries[0]!.passages.map((p) => p.text)).toEqual(["same", "more"]);
    expect(entries[0]!.score).toBe(0.9);
  });

  test("a long passage is cut and says so", () => {
    const [entry] = groupSearchResults([hit("a", "x".repeat(1000), 0.5)], []);

    expect(entry!.passages[0]).toEqual({ text: "x".repeat(280), truncated: true, contentChars: 1000 });
  });

  test("the record's type, dates and parent come from the record document", () => {
    const [entry] = groupSearchResults([hit("pr", "LGTM", 0.5)], [{
      _key: "pr",
      recordName: "Fix the cache",
      recordType: "PULL_REQUEST",
      connectorName: "GITHUB",
      webUrl: "https://github.test/pull/7",
      sourceCreatedAtTimestamp: Date.UTC(2026, 8, 1),
      sourceLastModifiedTimestamp: Date.UTC(2026, 8, 3),
      location: "GitHub (App ID: app-1) -> acme/api (Record Group ID: rg-1)",
    }]);

    expect(entry).toEqual({
      recordId: "pr",
      recordName: "Fix the cache",
      recordType: "PULL_REQUEST",
      connector: "GITHUB",
      webUrl: "https://github.test/pull/7",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
      parent: "acme/api",
      score: 0.5,
      passagesFound: 1,
      passages: [{ text: "LGTM" }],
    });
  });

  test("a ticket's or PR's status and its linked records come from the record document", () => {
    // In the misses of a run against real Slack, GitHub and Jira data, the
    // answer often cited the right record but lacked a fact the record holds
    // as metadata ("merged on 2026-09-25") or one that lives in a record it
    // links to. The server now sends both; each link is one short line.
    const [entry] = groupSearchResults([hit("thread", "see the PR", 0.5)], [{
      _key: "thread",
      recordType: "MESSAGE",
      linkedRecords: [
        { relation: "mentionedIn", recordId: "page-1", recordName: "Runbook", recordType: "WEBPAGE", connector: "CONFLUENCE" },
        {
          relation: "linksTo", recordId: "pr-1", recordName: "Fix sign-in", recordType: "PULL_REQUEST",
          connector: "GITHUB", status: "Merged 2026-09-25 by alice",
        },
      ],
    }, {
      _key: "pr-1",
      recordType: "PULL_REQUEST",
      statusSummary: "Merged 2026-09-25 by alice",
    }]);

    expect(entry!.links).toEqual([
      'links to PULL_REQUEST "Fix sign-in" — Merged 2026-09-25 by alice [pr-1]',
      'mentioned in WEBPAGE "Runbook" [page-1]',
    ]);
    expect(entry!.linksFound).toBeUndefined();
    expect(entry!.status).toBeUndefined();

    const pr = groupSearchResults([], [{ _key: "pr-1", statusSummary: "Merged 2026-09-25 by alice" }])[0];
    expect(pr!.status).toBe("Merged 2026-09-25 by alice");
    expect(pr!.links).toBeUndefined();
  });

  test("links are capped, counted and kept to one short line each", () => {
    const many = Array.from({ length: LINKS_PER_RECORD + 2 }, (_, i) => ({
      relation: "linksTo", recordId: `r${i}`, recordName: `Name\n${"x".repeat(200)}`, recordType: "TICKET",
    }));
    const { links, found } = linkLines([...many, { relation: "linksTo" }, "junk"]);

    expect(links).toHaveLength(LINKS_PER_RECORD);
    expect(found).toBe(LINKS_PER_RECORD + 2);
    for (const line of links) {
      expect(line).not.toContain("\n");
      expect(line.length).toBeLessThan(150);
    }
    const [entry] = groupSearchResults([], [{ _key: "a", linkedRecords: many }]);
    expect(entry!.linksFound).toBe(LINKS_PER_RECORD + 2);
  });

  test("an older server sends no status or links, and the entry has none", () => {
    expect(linkLines(undefined)).toEqual({ links: [], found: 0 });
    const [entry] = groupSearchResults([], [{ _key: "a", recordName: "A" }]);
    expect(entry).toEqual({ recordId: "a", recordName: "A", passagesFound: 0, passages: [] });
  });

  test("a matched record with no readable passage is still listed", () => {
    const entries = groupSearchResults([], [{ _key: "r", recordName: "Sheet" }]);
    expect(entries).toEqual([{ recordId: "r", recordName: "Sheet", passagesFound: 0, passages: [] }]);
  });

  test("the parent is the trail's names below the connector, without ids", () => {
    expect(parentFromLocation(
      "Slack (App ID: a1) -> #eng-backend (Record Group ID: g1) -> Deploy thread (Record ID: r1)",
    )).toBe("#eng-backend › Deploy thread");
    expect(parentFromLocation("Slack (App ID: a1)")).toBeUndefined();
    expect(parentFromLocation(undefined)).toBeUndefined();
  });
});

describe("a page that fits", () => {
  const many = groupSearchResults(
    Array.from({ length: 120 }, (_, i) => hit(`rec-${i}`, `passage ${i} `.repeat(30), 1 - i / 1000)),
    [],
  );

  test("records are cut to the budget, and the rest are a page away", () => {
    const first = pageSearchRecords(many, 0);
    expect(JSON.stringify(first.records).length).toBeLessThan(SEARCH_RESULT_MAX_CHARS);
    expect(first.nextOffset).toBe(first.records.length);

    const second = pageSearchRecords(many, first.nextOffset!);
    expect(second.records[0]!.recordId).toBe(`rec-${first.records.length}`);
  });

  test("a page always holds at least one record", () => {
    expect(pageSearchRecords(many, 0, 10).records).toHaveLength(1);
  });
});

describe("pipeshub_search", () => {
  const big = {
    searchId: "s-big",
    searchResponse: {
      searchResults: Array.from({ length: 300 }, (_, i) =>
        hit(`rec-${i % 60}`, `passage ${i} `.repeat(25), 1 - i / 1000)),
      records: [],
    },
  };

  test("a large search stays under the budget and says plainly that it was cut", async () => {
    const { core } = client([big]);

    const out = await tool$pipeshubSearch.tool(core, { query: "deploy" } as never, ctx());
    const text = out.content.map((c: { text?: string }) => c.text ?? "").join("");
    const body = JSON.parse(text);

    expect(text.length).toBeLessThanOrEqual(SEARCH_RESULT_MAX_CHARS);
    expect(body.totalRecords).toBe(60);
    expect(body.records.length).toBeLessThan(60);
    expect(body.nextOffset).toBe(body.records.length);
    expect(body.notes.at(-1)).toBe(
      `Showing records 1–${body.records.length} of 60. The rest were left out to keep this `
        + "result under 20,000 characters. For the next records, call pipeshub_search again "
        + `with the same arguments and offset: ${body.nextOffset}.`,
    );
  });

  test("the next page reads the same results without searching again", async () => {
    const { core, searches } = client([big]);
    const first = jsonOf(await tool$pipeshubSearch.tool(core, { query: "deploy" } as never, ctx()));

    const second = jsonOf(await tool$pipeshubSearch.tool(core, {
      query: "deploy",
      offset: first.nextOffset,
    } as never, ctx()));

    expect(searches()).toBe(1);
    expect(second.searchId).toBe("s-big");
    expect(second.records[0].recordId).toBe(`rec-${first.nextOffset}`);
    const seen = [...first.records, ...second.records].map((r: { recordId: string }) => r.recordId);
    expect(new Set(seen).size).toBe(seen.length);
  });

  test("another caller's offset never reads someone else's results", async () => {
    const mine = client([big], "token-a");
    await tool$pipeshubSearch.tool(mine.core, { query: "deploy" } as never, ctx());
    const theirs = client([{ searchId: "s-theirs", searchResponse: { searchResults: [], records: [] } }], "token-b");

    const out = jsonOf(await tool$pipeshubSearch.tool(theirs.core, {
      query: "deploy",
      offset: 5,
    } as never, ctx()));

    expect(theirs.searches()).toBe(1);
    expect(out.searchId).toBe("s-theirs");
    expect(out.notes[0]).toContain("the search ran again");
  });

  test("a first page always searches afresh", async () => {
    const { core, searches } = client([big]);
    await tool$pipeshubSearch.tool(core, { query: "deploy" } as never, ctx());
    await tool$pipeshubSearch.tool(core, { query: "deploy" } as never, ctx());
    expect(searches()).toBe(2);
  });

  test("a result that fits has no next page and no note", async () => {
    const { core } = client([{
      searchId: "s",
      searchResponse: { searchResults: [hit("a", "short", 0.5)], records: [] },
    }]);

    const out = jsonOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()));

    expect(out).toEqual({
      searchId: "s",
      totalRecords: 1,
      records: [{ recordId: "a", recordName: "a", score: 0.5, passagesFound: 1, passages: [{ text: "short" }] }],
    });
  });
});
