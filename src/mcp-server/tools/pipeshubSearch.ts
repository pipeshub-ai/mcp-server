
import * as z from "zod";
import { semanticSearchSearchWithDates } from "../../funcs/semanticSearchSearchWithDates.js";
import { SemanticSearchDateBounds } from "../../models/semanticsearchwithdatesrequest.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  isoFromEpochMs,
  jsonResult,
  readJson,
  resolveSourceScope,
  searchFilters,
  trimSearchHit,
} from "./_helpers.js";

/** Matches the SDK request default (`src/models/semanticsearchrequest.ts`). */
const DEFAULT_LIMIT = 10;

const args = {
  query: z.string().min(1).describe(
    "Natural language query. Vector search across the org's indexed records.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Vector matches to fetch per query variant. Default 10. The backend "
      + "searches a rewritten form of the query plus a few expanded variants, "
      + "and a match inside a thread, a pull request or a table returns every "
      + "passage of that section as its own hit — so one call can return many "
      + "more hits than `limit`, from only a few records. Use "
      + "`uniqueRecords` for the shortlist; 5–10 is enough to find a "
      + "`recordId`.",
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
  updatedAfter: dateArg(
    "Only records last changed in their source on or after this date. Use "
      + "it for \"what changed since …\" and to leave out superseded documents.",
  ),
  updatedBefore: dateArg(
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
  const ms = DATE_ONLY.test(text)
    ? Date.parse(`${text}T00:00:00Z`) + (upper ? DAY_MS - 1 : 0)
    : Date.parse(text);
  return Number.isFinite(ms) ? ms : undefined;
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
    [record?.sourceLastModifiedTimestamp, bounds.updatedAfter, false],
    [record?.sourceLastModifiedTimestamp, bounds.updatedBefore, true],
  ];
  return checks.some(([value, bound, upper]) => {
    const limit = boundMs(bound, upper);
    if (limit === undefined) return false;
    if (typeof value !== "number" || !Number.isFinite(value)) return true;
    return upper ? value > limit : value < limit;
  });
}

/**
 * One entry of the backend's `records` array — the full record document — cut
 * to what the model needs to pick and cite a record. `recordType` tells a pull
 * request from the Slack thread about it; the source dates (epoch
 * milliseconds on the record) tell a superseded decision from the current one.
 * Each is left out when the backend does not send a usable value.
 */
function trimSearchRecord(r: any) {
  const createdAt = isoFromEpochMs(r?.sourceCreatedAtTimestamp);
  const updatedAt = isoFromEpochMs(r?.sourceLastModifiedTimestamp);
  return {
    recordId: r?._key,
    recordName: r?.recordName,
    connector: r?.connectorName,
    mimeType: r?.mimeType,
    webUrl: r?.webUrl,
    ...(typeof r?.recordType === "string" ? { recordType: r.recordType } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export const tool$pipeshubSearch: ToolDefinition<typeof args> = {
  name: "pipeshub_search",
  description:
    `Vector / semantic search across the org's indexed documents.

**Use this when the user wants to LOCATE a document** — by name, topic,
or a phrase to grep for — and to resolve it to a \`recordId\`. For
open-ended questions across many documents, use \`pipeshub_chat\`
instead, which does the retrieval internally and returns an answer with
citations to check.

Typical uses:
- Resolve a doc name / topic into a \`recordId\` for
  \`pipeshub_get_record_content\` — step 1 of any full-document task
  (summarize, extract, review, "what does the doc say?").
- Resolve a filename / phrase into a \`recordId\` for
  \`pipeshub_download_record\`.
- Show the user a ranked list of matching files when they ask "find /
  search for X".

Not for structural questions — what is under this epic, which pages are
in this space, what links to this ticket. Ranking by content cannot show
how records relate; use \`pipeshub_get_record_content\` \`mode:"navigate"\`.

**A ranked sample, never a complete list.** Hits are the top-scoring
blocks from the best-matching records — not all blocks of any record, and
not every record that matches. Never count them to answer "how many" /
"all" / "every"; navigate the record group instead, which reports its
real total.

By default it searches everything. To search only some sources, pass
connector ids in \`apps\` and collection ids in \`kb\`.

Each hit is one matching passage, best match first:
\`{ recordId, recordName, score, snippet, mimeType, webUrl, ... }\`.
One record can fill many hits, so expect more hits than \`limit\`.
\`uniqueRecords\` lists each record once — use it as the shortlist. Link a
record by its \`webUrl\`.`,
  scopes: ["read"],
  annotations: {
    title: "Semantic search",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const limit = args.limit ?? DEFAULT_LIMIT;
    // Each id is sent in the list the backend reads it from: a collection id
    // in `apps` or a connector id in `kb` is dropped by the backend.
    const { scope, notes } = await resolveSourceScope(
      client,
      args.apps,
      args.kb,
      { signal: ctx.signal },
    );

    const bounds: SemanticSearchDateBounds = {
      ...(args.createdAfter ? { createdAfter: args.createdAfter } : {}),
      ...(args.createdBefore ? { createdBefore: args.createdBefore } : {}),
      ...(args.updatedAfter ? { updatedAfter: args.updatedAfter } : {}),
      ...(args.updatedBefore ? { updatedBefore: args.updatedBefore } : {}),
    };

    const [result] = await semanticSearchSearchWithDates(client, {
      query: args.query,
      limit,
      filters: searchFilters(scope),
      ...bounds,
    }, { fetchOptions: { signal: ctx.signal } }).$inspect();
    if (!result.ok) return errorResult(result.error.message);

    const parsed = await readJson<{
      searchId: string;
      searchResponse: {
        searchResults: any[];
        records?: any[];
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
          + "this PipesHub server probably does not support date filters. They "
          + "were removed. The server ranked records from every date, so fewer "
          + "remain than a server that filters by date would find.",
      );
    }
    return jsonResult({
      searchId: parsed.value.searchId,
      hits: hits.map(trimSearchHit),
      uniqueRecords: records.map(trimSearchRecord),
      ...(notes.length > 0 ? { notes } : {}),
    });
  },
};
