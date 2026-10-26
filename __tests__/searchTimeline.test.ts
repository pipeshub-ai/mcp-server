import { beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { pipeshubInstructions } from "../src/mcp-server/instructions.js";
import { forgetSearches } from "../src/mcp-server/tools/_searchResults.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";

// A summary over months needs material from every part of the span. A plain
// search returns the best matches, which bunch around one moment, so the
// tool can ask PipesHub to search each period of the span instead.

const DAY = 86_400_000;
const ms = (day: string) => Date.parse(`${day}T00:00:00Z`);

function hit(id: string, period?: number) {
  return {
    content: `passage of ${id}`,
    score: 0.5,
    metadata: { recordId: id, recordName: `Doc ${id}` },
    ...(period !== undefined ? { timelinePeriod: period } : {}),
  };
}

function record(id: string, day: string) {
  return {
    _key: id,
    recordName: `Doc ${id}`,
    sourceCreatedAtTimestamp: ms(day),
    sourceLastModifiedTimestamp: ms(day) + DAY,
  };
}

/** What a server with the option sends for three months, April quiet. */
const TIMELINE_RESPONSE = {
  searchResults: [hit("m1", 0), hit("m2", 0), hit("y1", 2)],
  records: [record("m1", "2026-03-03"), record("m2", "2026-03-20"), record("y1", "2026-05-02")],
  timeline: {
    dateField: "created",
    start: "2026-03-01",
    end: "2026-05-31",
    periods: [
      { label: "March 2026 (2026-03-01 to 2026-03-31)", start: "2026-03-01", end: "2026-03-31", records: 2, matches: 2 },
      { label: "April 2026 (2026-04-01 to 2026-04-30)", start: "2026-04-01", end: "2026-04-30", records: 0, matches: 0 },
      { label: "May 2026 (2026-05-01 to 2026-05-31)", start: "2026-05-01", end: "2026-05-31", records: 1, matches: 1 },
    ],
    notes: [],
  },
};

/** What a server without the option sends: a plain ranked search. */
const PLAIN_RESPONSE = {
  searchResults: [hit("m2"), hit("y1"), hit("m1")],
  records: [record("m2", "2026-03-20"), record("y1", "2026-05-02"), record("m1", "2026-03-03")],
};

function client(searchResponse: unknown) {
  const sent: any[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    const req = input as Request;
    sent.push(JSON.parse(await req.text()));
    return Response.json({ searchId: "s1", searchResponse });
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

async function run(core: PipeshubCore, args: Record<string, unknown>) {
  const result: any = await tool$pipeshubSearch.tool(core, args as never, ctx());
  expect(result.isError).toBeFalsy();
  return JSON.parse(result.content[0].text);
}

beforeEach(() => forgetSearches());

describe("pipeshub_search with timeline", () => {
  test("asks for a timeline only when the agent sets one, and still searches the query as written", async () => {
    const { core, sent } = client(TIMELINE_RESPONSE);
    await run(core, {
      query: "rollout",
      timeline: "created",
      createdAfter: "2026-03-01",
      createdBefore: "2026-05-31",
    });
    await run(core, { query: "rollout" });

    expect(sent[0]).toEqual({
      query: "rollout",
      limit: 10,
      createdAfter: "2026-03-01",
      createdBefore: "2026-05-31",
      rewriteQuery: false,
      saveHistory: false,
      timeline: "created",
    });
    expect(sent[1]).not.toHaveProperty("timeline");
  });

  test("returns the records oldest period first, each labelled with its period", async () => {
    const { core } = client(TIMELINE_RESPONSE);

    const out = await run(core, { query: "rollout", timeline: "created", createdAfter: "2026-03-01" });

    expect(out.records.map((r: any) => [r.recordId, r.period])).toEqual([
      ["m1", "March 2026 (2026-03-01 to 2026-03-31)"],
      ["m2", "March 2026 (2026-03-01 to 2026-03-31)"],
      ["y1", "May 2026 (2026-05-01 to 2026-05-31)"],
    ]);
    expect(out.timeline).toEqual({
      dateField: "created",
      start: "2026-03-01",
      end: "2026-05-31",
      periods: [
        { label: "March 2026 (2026-03-01 to 2026-03-31)", records: 2 },
        { label: "April 2026 (2026-04-01 to 2026-04-30)", records: 0 },
        { label: "May 2026 (2026-05-01 to 2026-05-31)", records: 1 },
      ],
    });
  });

  test("a quiet period is not taken as proof that nothing happened", async () => {
    const { core } = client(TIMELINE_RESPONSE);

    const out = await run(core, { query: "rollout", timeline: "created" });

    expect(out.notes.join(" ")).toContain("A period with no records may only mean nothing matched");
  });

  test("passes on the server's notes and says which periods could not be searched", async () => {
    const response = structuredClone(TIMELINE_RESPONSE) as any;
    response.timeline.notes = ["No start date was given, so this covers 2025-05-31 on."];
    response.timeline.periods[1].searchFailed = true;
    response.timeline.periods[2].searchIncomplete = "Only part of the index was searched.";
    const { core } = client(response);

    const out = await run(core, { query: "rollout", timeline: "created" });

    expect(out.notes).toContain("No start date was given, so this covers 2025-05-31 on.");
    expect(out.notes.join(" ")).toContain("April 2026 (2026-04-01 to 2026-04-30): its own search failed");
    expect(out.notes.join(" ")).toContain("May 2026 (2026-05-01 to 2026-05-31): Only part of the index");
    // April is the only empty period and its search failed, so it is not called quiet.
    expect(out.notes.join(" ")).not.toContain("A period with no records may only mean nothing matched");
  });

  test("an older server's plain search comes back as ranked, with a note saying so", async () => {
    const { core } = client(PLAIN_RESPONSE);

    const out = await run(core, { query: "rollout", timeline: "created" });

    expect(out.records.map((r: any) => r.recordId)).toEqual(["m2", "y1", "m1"]);
    expect(out.records.every((r: any) => r.period === undefined)).toBe(true);
    expect(out).not.toHaveProperty("timeline");
    expect(out.notes.join(" ")).toContain("did not run a timeline search");
    expect(out.notes.join(" ")).toContain("search each part of it with its own date bounds");
  });

  test("a plain search carries no period, timeline, or note about one", async () => {
    const { core } = client(PLAIN_RESPONSE);

    const out = await run(core, { query: "rollout" });

    expect(out).not.toHaveProperty("timeline");
    expect(out.records.every((r: any) => r.period === undefined)).toBe(true);
    expect(out.notes ?? []).toEqual([]);
  });

  test("off sends off and comes back ranked, with no timeline and no note about one", async () => {
    const { core, sent } = client(PLAIN_RESPONSE);

    const out = await run(core, {
      query: "rollout", timeline: "off", createdAfter: "2026-03-01", createdBefore: "2026-05-31",
    });

    expect(sent[0].timeline).toBe("off");
    expect(out.records.map((r: any) => r.recordId)).toEqual(["m2", "y1", "m1"]);
    expect(out).not.toHaveProperty("timeline");
    expect((out.notes ?? []).join(" ")).not.toContain("did not run a timeline search");
  });

  test("a timeline the server ran on its own is shaped like one the agent asked for", async () => {
    const response = structuredClone(TIMELINE_RESPONSE) as any;
    response.timeline.automatic = true;
    response.timeline.notes = ["The dates cover more than 31 days, so this was searched period by period."];
    const { core } = client(response);

    const out = await run(core, { query: "rollout", createdAfter: "2026-03-01", createdBefore: "2026-05-31" });

    expect(out.records.map((r: any) => r.recordId)).toEqual(["m1", "m2", "y1"]);
    expect(out.records[0].period).toBe("March 2026 (2026-03-01 to 2026-03-31)");
    expect(out.timeline.periods).toHaveLength(3);
    expect(out.notes).toContain("The dates cover more than 31 days, so this was searched period by period.");
    expect(out.notes.join(" ")).not.toContain("did not run a timeline search");
  });

  test("a later page keeps the periods, and a plain search is not served from a timeline's pages", async () => {
    const many = structuredClone(TIMELINE_RESPONSE) as any;
    const long = "x".repeat(900);
    for (let i = 0; i < 40; i++) {
      many.searchResults.push({ ...hit(`r${i}`, 2), content: long });
      many.records.push(record(`r${i}`, "2026-05-10"));
    }
    const { core, sent } = client(many);
    const args = { query: "rollout", timeline: "created" };

    const first = await run(core, args);
    expect(first.nextOffset).toBeGreaterThan(0);
    const second = await run(core, { ...args, offset: first.nextOffset });

    expect(sent.length).toBe(1);
    expect(second.timeline).toEqual(first.timeline);
    expect(second.records[0].period).toBe("May 2026 (2026-05-01 to 2026-05-31)");

    await run(core, { query: "rollout", offset: first.nextOffset });
    expect(sent.length).toBe(2);
  });

  test("refuses a timeline that is not created, modified or off", () => {
    const schema = z.object(tool$pipeshubSearch.args as any);
    expect(schema.safeParse({ query: "q", timeline: "created" }).success).toBe(true);
    expect(schema.safeParse({ query: "q", timeline: "modified" }).success).toBe(true);
    expect(schema.safeParse({ query: "q", timeline: "off" }).success).toBe(true);
    for (const timeline of ["updated", "none", true, ""]) {
      expect(schema.safeParse({ query: "q", timeline }).success).toBe(false);
    }
  });
});

describe("what the agent is told", () => {
  const flat = (text: string) => text.replace(/\s+/g, " ");
  const description = flat(tool$pipeshubSearch.description);
  const timelineArg = flat((tool$pipeshubSearch.args as any).timeline.description);

  test("search says when to use a timeline", () => {
    expect(description).toContain("Over a span of time");
    expect(description).toContain("set `timeline`");
    for (const when of ["how something evolved", "what changed between two dates", "a summary over weeks or months"]) {
      expect(timelineArg).toContain(when);
    }
  });

  test("date filters are when a record was written, not when an event happened", () => {
    expect(description).toContain("not when an event happened");
    expect(description).toContain("set `timeline` and the date filters to that span, widened past its end");
    expect(description).toContain("On a plain search, date filters match when a record was written");
    expect(description).toContain("Leave them off unless the question is about when records were written");
    for (const chat of [true, false]) {
      const text = flat(pipeshubInstructions({ chat }));
      expect(text).toContain("with `timeline`, and set the date filters to that span, widened past its end");
      expect(text).toContain("On a plain search, date filters match when a record was written");
    }
    expect(timelineArg).toContain("widen the span to take in write-ups made after the event");
    const createdAfter = flat((tool$pipeshubSearch.args as any).createdAfter.description);
    expect(createdAfter).toContain("not when an event in it happened");
  });

  test("a change question searches both the current state and the earlier one", () => {
    expect(description).toContain('For "has this changed?", search for the current state and the earlier one');
  });

  test("search and the instructions ask for every part of the question to be checked", () => {
    expect(description).toContain("check each part of the question against what you read");
    for (const chat of [true, false]) {
      const text = flat(pipeshubInstructions({ chat }));
      expect(text).toContain("list the parts of the question and confirm each is answered from what you read");
      expect(text).toContain('For "all", "every" or "how many", do not stop at the first matches');
      expect(text).toContain("`pipeshub_search` with `timeline`");
      expect(text).toContain('search for both the current state and the earlier one');
    }
  });

  test("the search-and-read default and navigate for counts still hold", () => {
    const text = flat(pipeshubInstructions({ chat: true }));
    expect(text).toContain("## Default: search, then read");
    expect(text).toContain('"how many / all / every" with `mode:"navigate"`');
    expect(description).toContain("navigate the record group instead");
  });
});
