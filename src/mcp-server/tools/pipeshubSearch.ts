
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
    "Only records created in their source on or after this date. "
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

Returns \`records\`, one per record, best first: \`recordId\`, name, type,
\`webUrl\`, source dates, \`parent\`, a ticket's or PR's \`status\` with
its date, linked records with theirs (\`links\`), \`passagesFound\` and up
to 3 \`passages\`. Results stay under 20,000 characters; if records were cut,
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
      const entries: SearchRecordEntry[] = groupSearchResults(
        hits,
        records,
        sr.omittedPassages ?? {},
      );
      search = { searchId: parsed.value.searchId, entries, notes };
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
      totalRecords: search.entries.length,
      records: page.records,
      ...(page.nextOffset !== undefined ? { nextOffset: page.nextOffset } : {}),
      ...(notes.length > 0 ? { notes } : {}),
    });
  },
};
