/**
 * Shape a search response into what an agent can read: one entry per record,
 * its best few passages, and a page that fits under a size budget.
 *
 * The search API returns one hit per passage. A match inside a thread, a pull
 * request or a table brings back every passage of that section, so a search
 * for ten records could return hundreds of hits, and well over the 25,000
 * tokens a client such as Claude Code accepts from one tool call. A result
 * that large is saved to a file or dropped, and the agent never reads it.
 */

import { createHash } from "node:crypto";
import { isoFromEpochMs, SNIPPET_MAX_CHARS } from "./_helpers.js";

/** Passages shown per record. The rest are counted in `passagesFound`. */
export const PASSAGES_PER_RECORD = 3;

/**
 * Linked records shown per record, one line each. The rest are counted in
 * `linksFound`. Records with a status of their own (a ticket, a pull request)
 * come first: "was the PR this thread links merged?" is what they answer.
 */
export const LINKS_PER_RECORD = 3;

/** Longest linked record name shown; a link line stays one short line. */
const LINK_NAME_MAX_CHARS = 100;

/**
 * Longest preview of a linked record's own text. The server sends one on the
 * first few linked records of a response, already this short or shorter.
 */
const LINK_PREVIEW_MAX_CHARS = 400;

/**
 * Most characters one search result may take, as sent. Under Claude Code's
 * 25,000-token limit for one tool result with room to spare, and small enough
 * that a few searches leave the agent room to work.
 */
export const SEARCH_RESULT_MAX_CHARS = 20_000;

/** Room kept for the envelope and the note that says the list was cut. */
const ENVELOPE_RESERVE_CHARS = 600;

export interface SearchPassage {
  text: string;
  truncated?: true;
  contentChars?: number;
  pageNum?: number;
}

export interface SearchRecordEntry {
  /** On a timeline search, the period the record is dated in. */
  period?: string;
  recordId: string;
  recordName?: string;
  recordType?: string;
  connector?: string;
  webUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Where the record sits: channel, thread, project, space, PR. */
  parent?: string;
  /** A ticket's or pull request's state: "Merged 2026-09-25 by alice". */
  status?: string;
  /**
   * Records this one names or is named by, one line each:
   * `links to PULL_REQUEST "Fix sign-in" — Merged 2026-09-25 [<recordId>]`,
   * and, when the server sent one, what the record says:
   * `mentioned in MESSAGE "eng_2026-09-26" — says: The thread asks … [<recordId>]`.
   */
  links?: string[];
  /** Linked records the server sent, shown or not, when some were left out. */
  linksFound?: number;
  score?: number;
  /** Passages search returned for this record, shown or not. */
  passagesFound: number;
  passages: SearchPassage[];
}

/**
 * The record's location trail, as PipesHub renders it for the assistant
 * ("Slack (App ID: a) -> #eng (Record Group ID: g) -> PR #12 (Record ID: r)"),
 * cut to the names below the connector. Undefined when the server sent none.
 */
export function parentFromLocation(location: unknown): string | undefined {
  if (typeof location !== "string" || location.trim() === "") return undefined;
  const names: string[] = [];
  for (const segment of location.split(" -> ")) {
    const m = /^(.*?)\s*\((App|Record Group|Record) ID: [^)]*\)\s*$/.exec(
      segment.trim(),
    );
    if (m?.[2] === "App") continue;
    const name = (m ? m[1] ?? "" : segment).trim();
    if (name) names.push(name);
  }
  return names.length > 0 ? names.join(" › ") : undefined;
}

/**
 * The record's linked records as short lines, those with a status first, then
 * those with a preview of their own text. A name such as
 * "tech_2025-12-01_18-04-44" does not say what the message says; the preview
 * does, so the agent can tell whether to open it.
 * `linkedRecords` is what the server sends on a record document (from
 * pipeshub-ai/pipeshub-ai, alongside `statusSummary`); an older server sends
 * none, and the entry carries no `links`.
 */
export function linkLines(linked: unknown): { links: string[]; found: number } {
  if (!Array.isArray(linked)) return { links: [], found: 0 };
  const rows = linked.filter(
    (row: any) => typeof row?.recordId === "string" && row.recordId !== "",
  );
  const ranked = rows
    .map((row: any, at: number) => ({ row, at }))
    .sort((a, b) =>
      Number(typeof b.row.status === "string") - Number(typeof a.row.status === "string")
      || Number(hasPreview(b.row)) - Number(hasPreview(a.row))
      || a.at - b.at
    );
  const links = ranked.slice(0, LINKS_PER_RECORD).map(({ row }) => {
    const relation = row.relation === "mentionedIn" ? "mentioned in" : "links to";
    const type = typeof row.recordType === "string" && row.recordType ? ` ${row.recordType}` : "";
    const rawName = typeof row.recordName === "string" ? linkText(row.recordName) : "";
    const name = rawName.length > LINK_NAME_MAX_CHARS
      ? `${rawName.slice(0, LINK_NAME_MAX_CHARS)}…`
      : rawName;
    const status = typeof row.status === "string" && row.status
      ? ` — ${linkText(row.status)}`
      : "";
    const rawPreview = hasPreview(row) ? linkText(row.preview) : "";
    const preview = rawPreview.length > LINK_PREVIEW_MAX_CHARS
      ? ` — says: ${rawPreview.slice(0, LINK_PREVIEW_MAX_CHARS)}…`
      : rawPreview ? ` — says: ${rawPreview}` : "";
    return `${relation}${type} "${name}"${status}${preview} [${row.recordId}]`;
  });
  return { links, found: rows.length };
}

function hasPreview(row: any): boolean {
  return typeof row?.preview === "string" && row.preview.trim() !== "";
}

function oneLine(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

/**
 * A name or status inside a link line: one line, and with no `[`, `]` or `"`,
 * so the quotes around the name and the trailing `[recordId]` are the only
 * ones. A title such as `Login fails [PROJ-42]` keeps its key as `(PROJ-42)`.
 */
function linkText(text: string): string {
  return oneLine(text).replace(/\[/g, "(").replace(/\]/g, ")").replace(/"/g, "'");
}

function passageText(hit: any): string | undefined {
  const text = typeof hit?.content === "string"
    ? hit.content
    : hit?.metadata?.blockText;
  return typeof text === "string" && text.trim() !== "" ? text : undefined;
}

function toPassage(hit: any, text: string): SearchPassage {
  const cut = text.length > SNIPPET_MAX_CHARS;
  const pages = Array.isArray(hit?.metadata?.pageNum)
    ? hit.metadata.pageNum
    : [hit?.metadata?.pageNum];
  const page = pages.find((p: unknown) => typeof p === "number");
  return {
    text: cut ? text.slice(0, SNIPPET_MAX_CHARS) : text,
    ...(cut ? { truncated: true as const, contentChars: text.length } : {}),
    ...(page !== undefined ? { pageNum: page } : {}),
  };
}

/**
 * The best passage first, as the server's own per-record cap ranks them: the
 * passages the search matched (a hit that was not expanded is one), by score;
 * then the passages around them, by score and nearness.
 */
function passageOrder(a: { hit: any; at: number }, b: { hit: any; at: number }) {
  const score = (h: any) => (typeof h?.score === "number" ? h.score : 0);
  const distance = (h: any) =>
    typeof h?.distanceFromMatch === "number" ? h.distanceFromMatch : 0;
  const neighbour = (h: any) => (distance(h) > 0 ? 1 : 0);
  return neighbour(a.hit) - neighbour(b.hit)
    || score(b.hit) - score(a.hit)
    || distance(a.hit) - distance(b.hit)
    || a.at - b.at;
}

/**
 * One entry per record, best record first.
 *
 * `hits` are the search API's `searchResults`, `records` its `records` (the
 * record documents), and `omittedPassages` its count of passages the server
 * left out per record. A record with no readable passage is still listed.
 */
export function groupSearchResults(
  hits: any[],
  records: any[],
  omittedPassages: Record<string, unknown> = {},
): SearchRecordEntry[] {
  const docs = new Map<string, any>();
  for (const r of records) {
    if (typeof r?._key === "string") docs.set(r._key, r);
  }

  const byRecord = new Map<string, Array<{ hit: any; at: number }>>();
  hits.forEach((hit, at) => {
    const id = hit?.metadata?.recordId;
    if (typeof id !== "string") return;
    if (!byRecord.has(id)) byRecord.set(id, []);
    byRecord.get(id)!.push({ hit, at });
  });
  for (const id of docs.keys()) {
    if (!byRecord.has(id)) byRecord.set(id, []);
  }

  const entries: SearchRecordEntry[] = [];
  for (const [recordId, found] of byRecord) {
    const doc = docs.get(recordId);
    const md = found[0]?.hit?.metadata ?? {};
    const ranked = [...found].sort(passageOrder);
    const passages: SearchPassage[] = [];
    const seen = new Set<string>();
    for (const { hit } of ranked) {
      if (passages.length >= PASSAGES_PER_RECORD) break;
      const text = passageText(hit);
      if (text === undefined || seen.has(text)) continue;
      seen.add(text);
      passages.push(toPassage(hit, text));
    }
    const best = ranked[0]?.hit?.score;
    const omitted = omittedPassages[recordId];
    const createdAt = isoFromEpochMs(doc?.sourceCreatedAtTimestamp);
    const updatedAt = isoFromEpochMs(doc?.sourceLastModifiedTimestamp);
    const parent = parentFromLocation(doc?.location);
    const recordName = doc?.recordName ?? md.recordName;
    const connector = doc?.connectorName ?? md.connector;
    const webUrl = doc?.webUrl ?? md.webUrl;
    const status = typeof doc?.statusSummary === "string" && doc.statusSummary
      ? oneLine(doc.statusSummary)
      : undefined;
    const { links, found: linksFound } = linkLines(doc?.linkedRecords);
    entries.push({
      recordId,
      ...(typeof recordName === "string" ? { recordName } : {}),
      ...(typeof doc?.recordType === "string" ? { recordType: doc.recordType } : {}),
      ...(typeof connector === "string" ? { connector } : {}),
      ...(typeof webUrl === "string" ? { webUrl } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      ...(parent ? { parent } : {}),
      ...(status ? { status } : {}),
      ...(links.length > 0 ? { links } : {}),
      ...(linksFound > links.length ? { linksFound } : {}),
      ...(typeof best === "number" ? { score: best } : {}),
      passagesFound: found.length
        + (typeof omitted === "number" && omitted > 0 ? omitted : 0),
      passages,
    });
  }
  return entries;
}

export interface SearchPage {
  records: SearchRecordEntry[];
  /** Where the next page starts, when there is one. */
  nextOffset?: number;
}

/**
 * The records from `offset` that fit in `maxChars` of compact JSON, leaving
 * room for the envelope. At least one record is returned whenever one is
 * left, so a page always makes progress.
 */
export function pageSearchRecords(
  entries: SearchRecordEntry[],
  offset: number,
  maxChars = SEARCH_RESULT_MAX_CHARS,
): SearchPage {
  const budget = maxChars - ENVELOPE_RESERVE_CHARS;
  const records: SearchRecordEntry[] = [];
  let used = 2;
  for (let i = offset; i < entries.length; i++) {
    const size = JSON.stringify(entries[i]).length + 1;
    if (records.length > 0 && used + size > budget) break;
    records.push(entries[i]!);
    used += size;
  }
  const end = offset + records.length;
  return end < entries.length ? { records, nextOffset: end } : { records };
}

/** Plain words for a page that does not hold every record. */
export function pageNote(
  offset: number,
  shown: number,
  total: number,
  nextOffset: number | undefined,
): string | undefined {
  if (nextOffset === undefined && offset === 0) return undefined;
  const range = shown === 0
    ? `No records from ${offset + 1}`
    : `Showing records ${offset + 1}–${offset + shown}`;
  const rest = nextOffset === undefined
    ? "This is the last page."
    : `The rest were left out to keep this result under ${
      SEARCH_RESULT_MAX_CHARS.toLocaleString("en-US")
    } characters. For the next records, call pipeshub_search again with the `
      + `same arguments and offset: ${nextOffset}.`;
  return `${range} of ${total}. ${rest}`;
}

// ─── Pages of one search ─────────────────────────────────────────────────────
//
// Searching again for the next page would not do: the server rewrites and
// expands the query with a model on every call, so a second search can rank
// records differently and a page could repeat or skip records. The records of
// a search are kept here for a short while instead, under a key derived from
// the caller's credentials and the search's arguments, so one caller can
// never read another's results.

const PAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const PAGE_CACHE_MAX = 32;

interface CachedSearch {
  at: number;
  searchId: unknown;
  entries: SearchRecordEntry[];
  notes: string[];
  /** A timeline search's periods, sent with every page. */
  timeline?: unknown;
  /** Matches written outside the date bounds, sent with the first page. */
  outsideDates?: unknown;
}

const pageCache = new Map<string, CachedSearch>();

/** A key for one caller's search; nothing secret is kept in it. */
export function searchCacheKey(credentials: unknown, args: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify([credentials ?? null, args]))
    .digest("hex");
}

export function rememberSearch(key: string, search: Omit<CachedSearch, "at">) {
  pageCache.delete(key);
  pageCache.set(key, { ...search, at: Date.now() });
  while (pageCache.size > PAGE_CACHE_MAX) {
    const oldest = pageCache.keys().next().value;
    if (oldest === undefined) break;
    pageCache.delete(oldest);
  }
}

export function recallSearch(key: string): Omit<CachedSearch, "at"> | undefined {
  const hit = pageCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > PAGE_CACHE_TTL_MS) {
    pageCache.delete(key);
    return undefined;
  }
  return hit;
}

/** For tests. */
export function forgetSearches() {
  pageCache.clear();
}
