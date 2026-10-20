
import * as z from "zod";
import { semanticSearchSearchWithDates } from "../../funcs/semanticSearchSearchWithDates.js";
import { SemanticSearchDateBounds } from "../../models/semanticsearchwithdatesrequest.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  jsonResult,
  readJson,
  resolveSecurity,
  resolveSourceScope,
  searchFilters,
} from "./_helpers.js";
import {
  groupSearchResults,
  pageNote,
  pageSearchRecords,
  recallSearch,
  rememberSearch,
  SEARCH_RESULT_MAX_CHARS,
  searchCacheKey,
  SearchRecordEntry,
} from "./_searchResults.js";

/** Matches the SDK request default (`src/models/semanticsearchrequest.ts`). */
const DEFAULT_LIMIT = 10;

const args = {
  query: z.string().min(1).describe(
    "Natural language query. Vector search across the org's indexed records.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Vector matches to fetch. Default 10. The tool asks for the query to be "
      + "searched as written. A PipesHub server that ignores that option "
      + "rewrites it instead and searches the rewrite plus a few variants, "
      + "`limit` matches each, so one call can return more records than "
      + "`limit`. 5–10 is enough to find a `recordId`.",
  ),
  offset: z.number().int().min(0).max(10_000).optional().describe(
    "Records to skip. To read the next page of the same results, pass the "
      + "previous call's `nextOffset` with the same other arguments.",
  ),
  apps: z.array(z.string()).optional().describe(
    "Connector ids to search (for example a Jira or Google Drive connection). "
      + "Get them from `pipeshub_sources`, where `kind` is \"connector\". "
      + "Collection ids go in `kb`, not here.",
  ),
  kb: z.array(z.string()).optional().describe(
    "Collection (knowledge base) ids to search. Get them from "
      + "`pipeshub_sources`, where `kind` is \"knowledgeBase\".",
  ),
  createdAfter: dateArg(
    "Only records created in their source on or after this date: when the "
      + "record was written, not when an event in it happened. "
      + "`YYYY-MM-DD` (that whole day, UTC) or an ISO 8601 datetime with a "
      + "timezone, such as `2026-09-01T09:00:00Z`.",
  ),
  createdBefore: dateArg(
    "Only records created in their source on or before this date. A "
      + "`YYYY-MM-DD` value includes that whole day.",
  ),
  modifiedAfter: dateArg(
    "Only records last changed in their source on or after this date. Use "
      + "it for \"what changed since …\" and to leave out superseded documents.",
  ),
  modifiedBefore: dateArg(
    "Only records last changed in their source on or before this date.",
  ),
  timeline: z.enum(["created", "modified", "off"]).optional().describe(
    "Search a span of time period by period, for how something evolved, "
      + "what changed between two dates, or a summary over weeks or months. "
      + "A plain search returns the best matches, which bunch around one "
      + "moment; this searches each period (a month, or a week within one "
      + "month, up to 6) and returns records oldest first, each with its "
      + "`period`. `\"created\"` places records by when they were created at "
      + "their source, `\"modified\"` by their last change. The span is "
      + "`createdAfter`/`createdBefore` (`modifiedAfter`/`modifiedBefore` "
      + "for `\"modified\"`); with no start it covers the year before the "
      + "end. Records are placed by when they were written, so widen the span "
      + "to take in write-ups made after the event. `limit` is then the "
      + "matches per period. A newer server also searches a range of more "
      + "than a month period by period when this is left out; `\"off\"` "
      + "asks for one ranked search instead. Send `\"off\"` only when a "
      + "result's `notes` offer it: an older server refuses it.",
  ),
};

function dateArg(description: string) {
  return z.string().trim().min(1).max(64).optional().describe(description);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * A date bound as epoch milliseconds, read the way the server reads it: a
 * bare date is the start of that day (UTC) as a lower bound and its last
 * millisecond as an upper one. Undefined when it cannot be read here; the
 * server then decides.
 */
export function boundMs(value: string | undefined, upper: boolean): number | undefined {
  if (!value) return undefined;
  const text = value.trim();
  const ms = DATE_ONLY.test(text) ? calendarDayMs(text, upper) : Date.parse(text);
  return ms !== undefined && Number.isFinite(ms) ? ms : undefined;
}

/**
 * A `YYYY-MM-DD` bound as the server's `_calendar_date` reads it. A day past
 * its month's end ("2026-02-30") is the month's last day as an upper bound and
 * the next month's first as a lower one, where `Date.parse` would roll over by
 * the extra days. Undefined for a month or day the server refuses.
 */
function calendarDayMs(text: string, upper: boolean): number | undefined {
  const [year = 0, month = 0, day = 0] = text.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = day <= lastDay
    ? Date.UTC(year, month - 1, day)
    : upper
    ? Date.UTC(year, month - 1, lastDay)
    : Date.UTC(year, month, 1);
  return upper ? start + DAY_MS - 1 : start;
}

/**
 * Whether a record from the search's `records` falls outside the bounds.
 *
 * A server that filters by date returns only records inside them, and never
 * one with no date on a bounded field. A server too old to know the bounds
 * ignores them and returns every date, so this is how the tool tells the two
 * apart.
 */
export function outsideDateBounds(record: any, bounds: SemanticSearchDateBounds): boolean {
  const checks: Array<[unknown, string | undefined, boolean]> = [
    [record?.sourceCreatedAtTimestamp, bounds.createdAfter, false],
    [record?.sourceCreatedAtTimestamp, bounds.createdBefore, true],
    [record?.sourceLastModifiedTimestamp, bounds.modifiedAfter, false],
    [record?.sourceLastModifiedTimestamp, bounds.modifiedBefore, true],
  ];
  return checks.some(([value, bound, upper]) => {
    const limit = boundMs(bound, upper);
    if (limit === undefined) return false;
    if (typeof value !== "number" || !Number.isFinite(value)) return true;
    return upper ? value > limit : value < limit;
  });
}

/** The search API's `timeline` object, on a server that ran one. */
interface ServerTimeline {
  dateField?: string;
  start?: string;
  end?: string;
  periods?: Array<{
    label?: string;
    records?: number;
    searchFailed?: boolean;
    searchIncomplete?: string;
  }>;
  notes?: string[];
}

/** What the agent is told about the periods, ahead of the records. */
export interface TimelineSummary {
  dateField: string;
  start?: string;
  end?: string;
  periods: Array<{ label: string; records: number }>;
}

const NO_TIMELINE_NOTE =
  "This PipesHub server did not run a timeline search (it is older than the "
  + "option, or it is turned off), so these are a plain ranked search, best "
  + "first, which can bunch around one moment. To cover the span, search each "
  + "part of it with its own date bounds.";

const QUIET_PERIOD_NOTE =
  "A period with no records may only mean nothing matched this query then. "
  + "Before saying nothing happened, search that period with its own dates "
  + "or other wording.";

/**
 * The records of a timeline search labelled with their period, oldest period
 * first, and the periods themselves. The server sends its hits in date order,
 * each with `timelinePeriod`, its index in `timeline.periods`; a record takes
 * the period of its first hit. A server without the option sends no
 * `timeline`, and the records stay as ranked, with a note that says so.
 */
export function shapeTimeline(
  entries: SearchRecordEntry[],
  hits: any[],
  server: ServerTimeline | undefined,
): { entries: SearchRecordEntry[]; timeline?: TimelineSummary; notes: string[] } {
  const periods = Array.isArray(server?.periods) ? server.periods : undefined;
  if (!server || !periods) return { entries, notes: [NO_TIMELINE_NOTE] };

  const periodOf = new Map<string, number>();
  for (const hit of hits) {
    const id = hit?.metadata?.recordId;
    const at = hit?.timelinePeriod;
    if (typeof id === "string" && Number.isInteger(at) && !periodOf.has(id)) {
      periodOf.set(id, at);
    }
  }
  const label = (at: number | undefined) => {
    const name = at === undefined ? undefined : periods[at]?.label;
    return typeof name === "string" && name ? name : undefined;
  };
  const rank = (e: SearchRecordEntry) => periodOf.get(e.recordId) ?? periods.length;
  const ordered = entries
    .map((entry, at) => ({ entry, at }))
    .sort((a, b) => rank(a.entry) - rank(b.entry) || a.at - b.at)
    .map(({ entry }) => {
      const period = label(periodOf.get(entry.recordId));
      return period ? { period, ...entry } : entry;
    });

  const notes = (server.notes ?? []).filter((n) => typeof n === "string" && n);
  for (const p of periods) {
    if (p?.searchFailed) {
      notes.push(`${p.label}: its own search failed; search it again before drawing conclusions.`);
    } else if (typeof p?.searchIncomplete === "string" && p.searchIncomplete) {
      notes.push(`${p.label}: ${p.searchIncomplete}`);
    }
  }
  if (periods.some((p) => p?.records === 0 && !p?.searchFailed && !p?.searchIncomplete)) {
    notes.push(QUIET_PERIOD_NOTE);
  }

  return {
    entries: ordered,
    timeline: {
      dateField: typeof server.dateField === "string" ? server.dateField : "created",
      ...(typeof server.start === "string" ? { start: server.start } : {}),
      ...(typeof server.end === "string" ? { end: server.end } : {}),
      periods: periods.map((p, at) => ({
        label: label(at) ?? `Period ${at + 1}`,
        records: typeof p?.records === "number" ? p.records : 0,
      })),
    },
    notes,
  };
}

export const tool$pipeshubSearch: ToolDefinition<typeof args> = {
  name: "pipeshub_search",
  description:
    `Vector / semantic search across the org's indexed documents.

**The default first step for a question about the org's knowledge**, and
for locating a document by name, topic, or phrase. Then read the records
that matter with \`pipeshub_get_record_content\` and answer from them;
search again with other wording or sources if the first results miss.
\`pipeshub_chat\`, where offered, is optional: it runs PipesHub's assistant
and returns an answer with citations to check.

For a full-document task (summarize, extract, review, "what does the doc
say?"), read the top hit with \`mode:"content"\`. Also: resolve a filename
into a \`recordId\` for \`pipeshub_download_record\`, or show the user a
ranked list of matching files when they ask "find / search for X".

Not for structural questions — what is under this epic, which pages are
in this space, what links to this ticket. Ranking by content cannot show
how records relate; use \`pipeshub_get_record_content\` \`mode:"navigate"\`.

**A ranked sample, never a complete list.** It returns the best-matching
records and a few passages of each — not every record that matches, not
every passage. Never count them to answer "how many" / "all" / "every";
navigate the record group instead, which reports its real total.

By default it searches everything. To search only some sources, pass
connector ids in \`apps\` and collection ids in \`kb\`.

**Over a span of time** (how X evolved, what changed between dates, a
summary over months) set \`timeline\` and the date filters to that span,
widened past its end for later write-ups: it searches each period, so one
moment's matches do not crowd out the rest.

On a plain search, date filters match when a record was written or last
changed, not when an event happened. Leave them off unless the question
is about when records were written.
For "has this changed?", search for the current state and the earlier one.
Before answering, check each part of the question against what you read.

Returns \`records\`, one per record, best first: \`recordId\`, name, type,
\`webUrl\`, source dates, \`parent\`, a ticket's or PR's \`status\` with
its date, linked records with theirs (\`links\`), \`passagesFound\` and up
to 3 \`passages\`. With \`timeline\`, oldest first, each with its
\`period\`. Results stay under 20,000 characters; if records were cut,
call again with \`offset\` set to \`nextOffset\`.`,
  scopes: ["read"],
  annotations: {
    title: "Semantic search",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    // Search changes nothing in the org's data. The server keeps the caller's
    // own search history (a history entry and the hits it returned), as it
    // does for a search in the web app. Hosts such as Claude Code run tools
    // side by side only when they are read-only, so `false` here made an
    // agent's batch of searches run one after another.
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const limit = args.limit ?? DEFAULT_LIMIT;
    const offset = args.offset ?? 0;
    const bounds: SemanticSearchDateBounds = {
      ...(args.createdAfter ? { createdAfter: args.createdAfter } : {}),
      ...(args.createdBefore ? { createdBefore: args.createdBefore } : {}),
      ...(args.modifiedAfter ? { modifiedAfter: args.modifiedAfter } : {}),
      ...(args.modifiedBefore ? { modifiedBefore: args.modifiedBefore } : {}),
    };
    // A later page reads the records this caller's same search returned,
    // rather than searching again (see `_searchResults.ts`).
    const key = searchCacheKey(await resolveSecurity(client), {
      query: args.query,
      limit,
      apps: args.apps ?? [],
      kb: args.kb ?? [],
      bounds,
      timeline: args.timeline ?? null,
    });
    const pagingNotes: string[] = [];
    let search = offset > 0 ? recallSearch(key) : undefined;
    if (offset > 0 && !search) {
      pagingNotes.push(
        "The earlier page's results were no longer held, so the search ran "
          + "again; it may rank records differently from that page.",
      );
    }

    if (!search) {
      // Each id is sent in the list the backend reads it from: a collection
      // id in `apps` or a connector id in `kb` is dropped by the backend.
      const { scope, notes } = await resolveSourceScope(
        client,
        args.apps,
        args.kb,
        { signal: ctx.signal },
      );

      const [result] = await semanticSearchSearchWithDates(client, {
        query: args.query,
        limit,
        filters: searchFilters(scope),
        ...bounds,
        // The calling agent writes its own queries, so the server's model
        // rewrite and expansion add about 4 s a search and little else. A
        // server older than the option ignores it and rewrites as before.
        rewriteQuery: false,
        ...(args.timeline ? { timeline: args.timeline } : {}),
      }, { fetchOptions: { signal: ctx.signal } }).$inspect();
      if (!result.ok) return errorResult(result.error.message);

      const parsed = await readJson<{
        searchId: string;
        searchResponse: {
          searchResults: any[];
          records?: any[];
          omittedPassages?: Record<string, unknown>;
          status?: string;
          message?: string;
          timeline?: ServerTimeline;
        };
      }>(result.value, "PipesHub search");
      if (!parsed.ok) return parsed.result;

      const sr = parsed.value.searchResponse ?? {};
      let hits = sr.searchResults ?? [];
      let records = sr.records ?? [];
      const outside = new Set(
        records.filter((r) => outsideDateBounds(r, bounds)).map((r) => r?._key),
      );
      if (outside.size > 0) {
        records = records.filter((r) => !outside.has(r?._key));
        hits = hits.filter((h) => !outside.has(h?.metadata?.recordId));
        notes.push(
          `${outside.size} record(s) came back outside the requested dates, so `
            + "this PipesHub server probably does not support date filters. "
            + "They were removed. The server ranked records from every date, so "
            + "fewer remain than a server that filters by date would find.",
        );
      }
      let entries: SearchRecordEntry[] = groupSearchResults(
        hits,
        records,
        sr.omittedPassages ?? {},
      );
      let timeline: TimelineSummary | undefined;
      // A newer server may run a timeline on its own for a wide date range;
      // "off" asked for a ranked search, so nothing is shaped or noted.
      const asked = args.timeline === "created" || args.timeline === "modified";
      if (asked || (args.timeline !== "off" && Array.isArray(sr.timeline?.periods))) {
        const shaped = shapeTimeline(entries, hits, sr.timeline);
        entries = shaped.entries;
        timeline = shaped.timeline;
        notes.push(...shaped.notes);
      }
      search = {
        searchId: parsed.value.searchId,
        entries,
        notes,
        ...(timeline ? { timeline } : {}),
      };
      rememberSearch(key, search);
    }

    const page = pageSearchRecords(search.entries, offset, SEARCH_RESULT_MAX_CHARS);
    const note = pageNote(
      offset,
      page.records.length,
      search.entries.length,
      page.nextOffset,
    );
    const notes = [...search.notes, ...pagingNotes, ...(note ? [note] : [])];
    return jsonResult({
      searchId: search.searchId,
      ...(search.timeline ? { timeline: search.timeline } : {}),
      totalRecords: search.entries.length,
      records: page.records,
      ...(page.nextOffset !== undefined ? { nextOffset: page.nextOffset } : {}),
      ...(notes.length > 0 ? { notes } : {}),
    });
  },
};
