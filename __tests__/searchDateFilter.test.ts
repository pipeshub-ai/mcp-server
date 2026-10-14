import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import {
  boundMs,
  outsideDateBounds,
  tool$pipeshubSearch,
} from "../src/mcp-server/tools/pipeshubSearch.js";

// "What changed since September" needs a date filter on search. PipesHub's
// retrieval already filters by a record's created and last-updated dates; the
// tool now sends the caller's bounds, and checks the answer, because a server
// too old to know them ignores them and returns every date.

const SEPT_1 = Date.parse("2026-09-01T00:00:00Z");
const AUG_15 = Date.parse("2026-08-15T00:00:00Z");

function client(body: unknown, status = 200) {
  const sent: any[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const req = input as Request;
    sent.push(JSON.parse(await req.text()));
    return Response.json(body, { status });
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
const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");

function response(records: any[]) {
  return {
    searchId: "s1",
    searchResponse: {
      searchResults: records.map((r) => ({
        content: `passage of ${r._key}`,
        score: 0.5,
        metadata: { recordId: r._key, recordName: r._key },
      })),
      records,
    },
  };
}

describe("pipeshub_search date bounds", () => {
  test("the four bounds are optional strings", () => {
    const schema = z.object(tool$pipeshubSearch.args);
    expect(schema.safeParse({ query: "q", modifiedAfter: "2026-09-01" }).success)
      .toBe(true);
    expect(schema.safeParse({ query: "q", createdBefore: "" }).success)
      .toBe(false);
    expect(schema.safeParse({ query: "q", modifiedBefore: 20260901 }).success)
      .toBe(false);
  });

  test("bounds the caller set reach the server, and no others", async () => {
    const { core, sent } = client(response([]));
    await tool$pipeshubSearch.tool(core, {
      query: "release notes",
      modifiedAfter: "2026-09-01",
      createdBefore: "2026-10-01T00:00:00Z",
    } as never, ctx());
    await tool$pipeshubSearch.tool(core, { query: "release notes" } as never, ctx());

    expect(sent[0]).toMatchObject({
      query: "release notes",
      modifiedAfter: "2026-09-01",
      createdBefore: "2026-10-01T00:00:00Z",
    });
    expect(Object.keys(sent[0])).not.toContain("createdAfter");
    expect(Object.keys(sent[1])).not.toContain("modifiedAfter");
  });

  test("records a server returns outside the bounds are removed and said so", async () => {
    // What a server that ignores the bounds sends back.
    const { core } = client(response([
      { _key: "new", sourceLastModifiedTimestamp: SEPT_1 + 1 },
      { _key: "old", sourceLastModifiedTimestamp: AUG_15 },
      { _key: "undated" },
    ]));

    const out = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, {
      query: "q",
      modifiedAfter: "2026-09-01",
    } as never, ctx())));

    expect(out.uniqueRecords.map((r: any) => r.recordId)).toEqual(["new"]);
    expect(out.hits.map((h: any) => h.recordId)).toEqual(["new"]);
    expect(out.notes.join(" ")).toContain(
      "2 record(s) came back outside the requested dates",
    );
  });

  test("a server that filters leaves nothing to remove and no note", async () => {
    const { core } = client(response([
      { _key: "new", sourceLastModifiedTimestamp: SEPT_1 },
    ]));

    const out = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, {
      query: "q",
      modifiedAfter: "2026-09-01",
    } as never, ctx())));

    expect(out.uniqueRecords.map((r: any) => r.recordId)).toEqual(["new"]);
    expect(out.notes).toBeUndefined();
  });

  test("the server's refusal of a date reaches the caller", async () => {
    const { core } = client(
      { error: { message: "modifiedAfter: 'last week' is not a valid ISO 8601 date." } },
      400,
    );

    const result = await tool$pipeshubSearch.tool(core, {
      query: "q",
      modifiedAfter: "last week",
    } as never, ctx());

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("'last week' is not a valid ISO 8601 date");
  });
});

describe("reading a bound the way the server does", () => {
  test("a bare date covers that whole day", () => {
    expect(boundMs("2026-09-01", false)).toBe(SEPT_1);
    expect(boundMs("2026-09-01", true)).toBe(SEPT_1 + 86_400_000 - 1);
  });

  test("a day past the month's end is clamped as the server clamps it", () => {
    const MARCH_1 = Date.parse("2026-03-01T00:00:00Z");
    // Lower bounds roll to the next month's first, upper bounds stop at the
    // month's last millisecond, instead of rolling over by the extra days.
    expect(boundMs("2026-02-31", false)).toBe(MARCH_1);
    expect(boundMs("2026-02-29", true)).toBe(MARCH_1 - 1);
    expect(boundMs("2026-04-31", true)).toBe(Date.parse("2026-05-01T00:00:00Z") - 1);
    const onMarch1 = { sourceLastModifiedTimestamp: MARCH_1 };
    expect(outsideDateBounds(onMarch1, { modifiedAfter: "2026-02-31" })).toBe(false);
    expect(outsideDateBounds(onMarch1, { modifiedBefore: "2026-02-29" })).toBe(true);
    expect(boundMs("2026-13-01", false)).toBeUndefined();
  });

  test("a datetime is used as given, and an unreadable one is left to the server", () => {
    expect(boundMs("2026-09-01T05:30:00+05:30", false)).toBe(SEPT_1);
    expect(boundMs("last week", false)).toBeUndefined();
    expect(outsideDateBounds({}, { modifiedAfter: "last week" })).toBe(false);
  });

  test("each bound reads its own date field", () => {
    const record = {
      sourceCreatedAtTimestamp: AUG_15,
      sourceLastModifiedTimestamp: SEPT_1,
    };
    expect(outsideDateBounds(record, { createdAfter: "2026-09-01" })).toBe(true);
    expect(outsideDateBounds(record, { modifiedAfter: "2026-09-01" })).toBe(false);
    expect(outsideDateBounds(record, { modifiedBefore: "2026-08-31" })).toBe(true);
    expect(outsideDateBounds(record, { createdBefore: "2026-08-15" })).toBe(false);
  });
});
