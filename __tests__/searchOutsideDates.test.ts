import { beforeEach, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { forgetSearches } from "../src/mcp-server/tools/_searchResults.js";
import {
  shapeOutsideDates,
  tool$pipeshubSearch,
} from "../src/mcp-server/tools/pipeshubSearch.js";

// A date filter matches when a record was written, not when the event in it
// happened, so a release page written in May about the week of 29 December is
// left out of a search bounded to that week. A newer PipesHub server runs the
// same search once without dates and sends its best matches outside them in
// `outsideDates`, apart from the results; the tool passes them on.

const DEC_30 = Date.parse("2025-12-30T00:00:00Z");
const MAY_21 = Date.parse("2026-05-21T00:00:00Z");
const FEB_10 = Date.parse("2026-02-10T00:00:00Z");

function client(body: unknown) {
  const fetcher = async () => Response.json(body);
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({ fetcher }),
  });
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");

function hits(records: Array<{ _key: string }>, passages = 1) {
  return records.flatMap((r) =>
    Array.from({ length: passages }, (_, i) => ({
      content: `passage ${i} of ${r._key}`,
      score: 0.9 - i / 10,
      metadata: { recordId: r._key, recordName: `Doc ${r._key}` },
    }))
  );
}

const standup = { _key: "standup", recordName: "Standup", sourceCreatedAtTimestamp: DEC_30 };
const release = { _key: "release", recordName: "v0.2.0 — Week of 2025-12-29", sourceCreatedAtTimestamp: MAY_21 };
const retro = { _key: "retro", recordName: "Retro", sourceCreatedAtTimestamp: FEB_10 };

const WEEK = { createdAfter: "2025-12-28", createdBefore: "2026-01-12" };

beforeEach(() => forgetSearches());

describe("pipeshub_search outsideDates", () => {
  test("passes on the matches written outside the dates, apart from the records", async () => {
    const core = client({
      searchId: "s1",
      searchResponse: {
        searchResults: hits([standup]),
        records: [standup],
        outsideDates: {
          note: "server note",
          searchResults: hits([release, retro], 3),
          records: [release, retro],
        },
      },
    });

    const out = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, {
      query: "what shipped that week",
      ...WEEK,
    } as never, ctx())));

    // The records are what the dates allow, and nothing was removed from them.
    expect(out.records.map((r: any) => r.recordId)).toEqual(["standup"]);
    expect(out.notes).toBeUndefined();
    expect(out.outsideDates.note).toContain("written outside your dates");
    expect(out.outsideDates.records.map((r: any) => r.recordId)).toEqual(["release", "retro"]);
    const first = out.outsideDates.records[0];
    expect(first.recordName).toBe("v0.2.0 — Week of 2025-12-29");
    expect(first.createdAt).toStartWith("2026-05-21");
    expect(first.passages).toEqual([{ text: "passage 0 of release" }]);
    expect(first.passagesFound).toBe(3);
  });

  test("they come with the first page only", async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      _key: `r${i}`,
      sourceCreatedAtTimestamp: DEC_30,
    }));
    const body = {
      searchId: "s2",
      searchResponse: {
        searchResults: many.map((r) => ({
          content: "x".repeat(600),
          score: 0.5,
          metadata: { recordId: r._key },
        })),
        records: many,
        outsideDates: { searchResults: hits([release]), records: [release] },
      },
    };
    const core = client(body);
    const args = { query: "paged", ...WEEK };

    const first = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, args as never, ctx())));
    expect(first.outsideDates.records.map((r: any) => r.recordId)).toEqual(["release"]);
    expect(first.nextOffset).toBeGreaterThan(0);
    expect(textOf(await tool$pipeshubSearch.tool(core, args as never, ctx())).length)
      .toBeLessThanOrEqual(20_000);

    const second = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, {
      ...args,
      offset: first.nextOffset,
    } as never, ctx())));
    expect(second.outsideDates).toBeUndefined();
  });

  test("a server without the field sends nothing, and the tool adds nothing", async () => {
    const core = client({
      searchId: "s3",
      searchResponse: { searchResults: hits([standup]), records: [standup] },
    });

    const out = JSON.parse(textOf(await tool$pipeshubSearch.tool(core, {
      query: "older server",
      ...WEEK,
    } as never, ctx())));

    expect(out.outsideDates).toBeUndefined();
  });

  test("an empty or malformed field is left out", () => {
    expect(shapeOutsideDates(undefined)).toBeUndefined();
    expect(shapeOutsideDates({})).toBeUndefined();
    expect(shapeOutsideDates({ searchResults: "x" as never, records: null as never }))
      .toBeUndefined();
  });

  test("the field says what it is and how to read it", () => {
    expect(shapeOutsideDates({ searchResults: hits([release]), records: [release] })?.note)
      .toContain("read it with `pipeshub_get_record_content`");
  });
});
