//
// Each curated tool fetches a Response from one of the SDK funcs and then
// trims / restructures the body before handing it to the LLM. The helpers
// here keep that work out of the individual tool files.

import * as z from "zod";
import { Security } from "../../models/security.js";
import { PipeshubCore } from "../../core.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { agentsListAgents } from "../../funcs/agentsListAgents.js";
import { knowledgeHubGetKnowledgeHubRootNodes } from "../../funcs/knowledgeHubGetKnowledgeHubRootNodes.js";
import {
  AgentListEnvelope$zodSchema,
  AgentSummary,
} from "../../models/agentops.js";

/**
 * Parse a fetch Response as JSON, returning a CallToolResult error when the
 * status is not ok, or the body is missing / malformed.
 *
 * The status check has to happen here rather than in each caller. The SDK funcs
 * are generated with `errorCodes: []`, so `result.ok` reports transport
 * failures only and a 401 arrives looking exactly like a success. Parsing that
 * body yields an envelope with no results in it, which every caller then
 * reports as an empty corpus — a failed credential becomes "no documents
 * found". Guarding at the single point where a body is turned into a value
 * closes that for every present and future caller.
 */
export async function readJson<T = unknown>(
  response: Response,
  context = "PipesHub request",
): Promise<{ ok: true; value: T } | { ok: false; result: CallToolResult }> {
  const httpErr = await httpErrorResult(response, context);
  if (httpErr) return { ok: false, result: httpErr };

  const text = await response.text();
  if (!text) {
    return {
      ok: false,
      result: {
        content: [{ type: "text", text: "Empty response from server" }],
        isError: true,
      },
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch (e: unknown) {
    return {
      ok: false,
      result: {
        content: [{
          type: "text",
          text: `Failed to parse response as JSON: ${
            (e as Error).message
          }\n\nRaw body:\n${text.slice(0, 500)}`,
        }],
        isError: true,
      },
    };
  }
}

/**
 * Reject an access token whose own expiry has already passed.
 *
 * Expiry is the one part of a credential's validity that can be established
 * without asking the server, so it is worth checking before spending a
 * round-trip — and it still answers when the server is unreachable. Returns
 * `null` when the token is unexpired or carries no usable `exp`.
 */
export function expiredTokenError(exp: unknown): CallToolResult | null {
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (exp * 1000 > Date.now()) return null;
  return errorResult(
    `The access token expired on ${new Date(exp * 1000).toISOString()}. `
      + "Mint a new personal access token in PipesHub under "
      + "Developer Settings → Personal Access Tokens.",
  );
}

/** Return a CallToolResult holding a single JSON-stringified text block. */
export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

/** Standard error → CallToolResult conversion. */
export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/**
 * Guard a (possibly streaming) `Response` on its HTTP status. The streaming
 * SDK funcs configure `errorCodes: []`, so the request layer treats ANY HTTP
 * response — including 401 / 403 / 404 / 5xx — as a success and hands back the
 * raw `Response`. Without this check those failures slip into the SSE drain
 * and surface as the useless "stream ended without usable frames".
 *
 * Returns a `CallToolResult` error (status + best-effort message from the body)
 * when the response is not ok, or `null` when it is ok (body left untouched so
 * the caller can still stream it).
 */
export async function httpErrorResult(
  response: Response,
  context: string,
): Promise<CallToolResult | null> {
  if (response.ok) return null;

  let body = "";
  try {
    body = await response.text();
  } catch {
    // body unreadable (e.g. already-consumed or transport error)
  }

  let message: string = body;
  if (body) {
    try {
      const parsed = JSON.parse(body);
      // Only accept string fields — error envelopes often nest an object
      // under `error`, which must not stringify to "[object Object]".
      const candidate =
        (typeof parsed?.message === "string" && parsed.message)
        || (typeof parsed?.error === "string" && parsed.error)
        || (typeof parsed?.error?.message === "string" && parsed.error.message)
        || (typeof parsed?.detail === "string" && parsed.detail)
        || "";
      message = candidate || body; // fall back to the raw JSON text
    } catch {
      // not JSON — keep the raw text
    }
  }

  // The server's reason rarely ends in punctuation, which runs it straight
  // into the hint below ("Invalid token Check that ...").
  const reason = message.slice(0, 400).trim();
  const detail = reason
    ? ` ${/[.!?]$/.test(reason) ? reason : `${reason}.`}`
    : "";
  const auth = (response.status === 401 || response.status === 403)
    ? " Check that the bearer token / credentials are valid and not expired."
    : "";
  return errorResult(
    `${context} failed (HTTP ${response.status} ${response.statusText}).${detail}${auth}`,
  );
}

/**
 * Read a `Response` body as JSON and validate it against a zod `schema`,
 * returning the typed value or a `CallToolResult` error (empty body, invalid
 * JSON, or a shape that doesn't match the schema).
 */
export async function readValidated<T>(
  response: Response,
  schema: z.ZodType<T>,
  context = "PipesHub request",
): Promise<{ ok: true; value: T } | { ok: false; result: CallToolResult }> {
  // Same reasoning as readJson: never let a non-2xx body reach the parser.
  const httpErr = await httpErrorResult(response, context);
  if (httpErr) return { ok: false, result: httpErr };

  const text = await response.text();
  if (!text) {
    return { ok: false, result: errorResult("Empty response from server") };
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      result: errorResult(
        `Failed to parse response as JSON: ${(e as Error).message}`
          + `\n\nRaw body:\n${text.slice(0, 500)}`,
      ),
    };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      result: errorResult(
        `Unexpected response shape:\n${z.prettifyError(parsed.error)}`,
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

/** Resolve `client._options.security` (which may be a function) to a value. */
export async function resolveSecurity(
  client: PipeshubCore,
): Promise<Security | undefined> {
  const sec = client._options.security;
  if (typeof sec === "function") {
    return await sec();
  }
  return sec;
}

/**
 * Decode the bearer JWT and return its claim payload, or null if no bearer
 * is configured / the token isn't a JWT.
 *
 * NOTE: this does NOT verify the signature — we trust the token because the
 * server already accepted it on the previous request. The decoded payload
 * is for surfacing identity (userId, email) back to the LLM, not for
 * authorization decisions.
 */
export async function decodeBearer(
  client: PipeshubCore,
): Promise<Record<string, unknown> | null> {
  // Only the static `bearerAuth` JWT is decodable here. The oauth2
  // credentials flow fetches a token dynamically per request, so it
  // isn't available at this layer.
  const sec = await resolveSecurity(client);
  const token = sec?.bearerAuth;
  if (!token) return null;
  const parts = token.split(".");
  const claims = parts[1];
  if (!claims) return null;
  try {
    const padded = claims + "=".repeat((4 - claims.length % 4) % 4);
    const json = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Trimmers for chat / search payloads ─────────────────────────────────────

/**
 * The full Conversation blob is ~kilobytes; the LLM almost always only wants
 * the latest answer + grounding. Pull just that.
 */
export function trimConversation(conv: any) {
  const messages: any[] = Array.isArray(conv?.messages) ? conv.messages : [];
  const lastBot = [...messages].reverse().find(
    (m) => m?.messageType === "bot_response",
  );

  return {
    conversationId: conv?._id,
    title: conv?.title,
    status: conv?.status,
    answer: lastBot?.content ?? null,
    confidence: lastBot?.confidence ?? null,
    citations: trimCitations(lastBot?.citations),
    followUpQuestions: lastBot?.followUpQuestions?.map((q: any) =>
      typeof q === "string" ? q : q?.question
    ).filter(Boolean) ?? [],
    messageCount: messages.length,
  };
}

export function trimCitations(citations: unknown) {
  if (!Array.isArray(citations)) return [];
  return citations.map((c: any) => {
    // Two wire shapes exist. Flat: `{ content, chunkIndex, metadata }`.
    // Nested (current backend): `{ citationId, citationData: { content,
    // chunkIndex, metadata } }`. Reading only the flat one silently yields
    // a citation with every field `undefined` — which JSON.stringify drops,
    // leaving `{"snippet": null}` and no way to identify the source at all.
    const cd = c?.citationData ?? c;
    const md = cd?.metadata ?? c?.metadata ?? {};
    const content = typeof cd?.content === "string" ? cd.content : c?.content;
    return {
      recordId: md.recordId ?? cd?.recordId ?? c?.recordId,
      recordName: md.recordName ?? cd?.recordName ?? c?.recordName,
      snippet: typeof content === "string"
        ? content.slice(0, 280)
        : md.blockText ?? null,
      mimeType: md.mimeType,
      webUrl: md.webUrl,
      pageNum: md.pageNum,
      chunkIndex: cd?.chunkIndex ?? c?.chunkIndex ?? md.chunkIndex,
    };
  });
}

// ─── SSE parsing ─────────────────────────────────────────────────────────────

/**
 * One SSE frame as emitted by `/conversations/stream`.
 *
 * Wire format per frame:
 *   event: <name>\n
 *   data: <json>\n
 *   \n
 *
 * `data` is parsed as JSON; on parse failure the raw string is preserved
 * under `raw` so the caller can decide how to react.
 */
export type SSEFrame = {
  event: string;
  data: any;
  raw?: string;
};

/**
 * Async-iterate SSE frames off a `Response` body. Handles multi-line
 * `data:` accumulation per spec, ignores comment lines (leading `:`),
 * tolerates `\r\n` and `\n` line endings, and parses `data` as JSON when
 * possible. Yields one frame per blank-line-terminated event.
 *
 * The signal passed in is honoured by the underlying fetch / reader; this
 * generator does not need to recheck it.
 */
export async function* iterateSSE(
  response: Response,
): AsyncGenerator<SSEFrame, void, unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  let event = "message";
  let dataLines: string[] = [];

  const flush = (): SSEFrame | null => {
    if (dataLines.length === 0) {
      event = "message";
      return null;
    }
    const raw = dataLines.join("\n");
    let data: any = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      // leave as raw string
    }
    const frame: SSEFrame = { event, data, raw };
    event = "message";
    dataLines = [];
    return frame;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Process complete lines; keep the trailing partial line in `buf`.
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (line === "") {
          const f = flush();
          if (f) yield f;
          continue;
        }
        if (line.startsWith(":")) continue; // comment / heartbeat
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? "" : line.slice(colon + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "event") event = value;
        else if (field === "data") dataLines.push(value);
        // `id` and `retry` are unused for our purposes.
      }
    }
    // Flush any final buffered frame on EOS.
    const tail = decoder.decode();
    if (tail) buf += tail;
    if (buf.length > 0) {
      // Treat remaining buffer as one last line.
      let line = buf;
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line !== "" && !line.startsWith(":")) {
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? "" : line.slice(colon + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "event") event = value;
        else if (field === "data") dataLines.push(value);
      }
    }
    const f = flush();
    if (f) yield f;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

// ── Trimmed agent shape handed to the LLM ────────────────────────────────────

interface AgentToolsetView {
  /** Integration / connector key, e.g. `jira`, `gmail`. */
  name: string | null | undefined;
  /** Fully-qualified tool ids the agent can run, e.g. `jira.create_issue`. */
  tools: string[];
}

interface AgentKnowledgeView {
  name: string | null | undefined;
  type: string | null | undefined;
}

export interface EnrichedAgent {
  agentId: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  startMessage: string | null;
  tags: string[];
  webSearch: boolean;
  isActive: boolean | null | undefined;
  toolsets: AgentToolsetView[];
  knowledge: AgentKnowledgeView[];
}

/**
 * Trim an enriched `AgentSummary` (from `GET /agents`) to just what the LLM
 * needs to pick and converse with an agent. Strips ids/revs/timestamps/perms
 * and the heavy nested tool/knowledge metadata, keeping the routing-critical
 * signal: each toolset's connector `name` + its tool ids (e.g.
 * `jira.create_issue`), and each knowledge source's `name`/`type`.
 */
export function trimAgent(a: AgentSummary): EnrichedAgent {
  return {
    agentId: a._key,
    name: a.name,
    description: a.description ?? null,
    systemPrompt: a.systemPrompt ?? null,
    startMessage: a.startMessage ?? null,
    tags: a.tags,
    webSearch: !!a.webSearch,
    isActive: a.isActive,
    toolsets: a.toolsets.map((ts) => ({
      name: ts.name,
      tools: ts.tools
        .map((t) => t.fullName ?? t.name)
        .filter((id): id is string => typeof id === "string"),
    })),
    knowledge: a.knowledge.map((k) => ({
      name: k.name ?? k.displayName,
      type: k.type,
    })),
  };
}

/**
 * Fetch the COMPLETE agent list, auto-paginating `GET /agents` so callers
 * (discovery + routing) never have to manage page numbers. Pages are fetched
 * at the max page size until the backend reports no more (`hasNext` /
 * `hasNextPage`, with a short-page fallback), capped by `maxPages` as a
 * runaway guard. Returns the raw `AgentListItem`s plus a normalized `total`
 * and a `truncated` flag (true if the cap was hit before exhausting pages).
 */
export async function listAllAgents(
  client: PipeshubCore,
  opts: {
    search?: string | undefined;
    signal?: AbortSignal | undefined;
    maxPages?: number | undefined;
  } = {},
): Promise<
  | { ok: true; agents: AgentSummary[]; total: number; truncated: boolean }
  | { ok: false; result: CallToolResult }
> {
  const PAGE_SIZE = 200;
  const maxPages = opts.maxPages ?? 25;
  // Only set `signal` when present (exactOptionalPropertyTypes).
  const reqOptions = opts.signal
    ? { fetchOptions: { signal: opts.signal } }
    : {};

  const all: AgentSummary[] = [];
  let total = 0;

  for (let page = 1; page <= maxPages; page++) {
    const [r] = await agentsListAgents(client, {
      page,
      limit: PAGE_SIZE,
      search: opts.search,
    }, reqOptions).$inspect();
    if (!r.ok) return { ok: false, result: errorResult(r.error.message) };

    const httpErr = await httpErrorResult(r.value, "Agent list request");
    if (httpErr) return { ok: false, result: httpErr };

    const parsed = await readValidated(r.value, AgentListEnvelope$zodSchema);
    if (!parsed.ok) return { ok: false, result: parsed.result };
    if (parsed.value.success === false) {
      return {
        ok: false,
        result: errorResult("Agent list request returned success: false"),
      };
    }

    const agents = parsed.value.agents;
    all.push(...agents);

    const pg = parsed.value.pagination;
    total = pg?.totalItems ?? pg?.total ?? all.length;

    const hasNext = pg?.hasNext ?? pg?.hasNextPage ?? (agents.length >= PAGE_SIZE);
    if (!hasNext || agents.length === 0) {
      return { ok: true, agents: all, total, truncated: false };
    }
  }

  // Hit the page cap with more pages still available.
  return { ok: true, agents: all, total: total || all.length, truncated: true };
}

/** Trim a single search hit to what the LLM actually needs. */
export function trimSearchHit(hit: any) {
  const md = hit?.metadata ?? {};
  return {
    recordId: md.recordId,
    recordName: md.recordName,
    score: hit?.score,
    snippet: typeof hit?.content === "string"
      ? hit.content.slice(0, 280)
      : md.blockText,
    mimeType: md.mimeType,
    extension: md.extension,
    connector: md.connector,
    webUrl: md.webUrl,
    pageNum: md.pageNum,
  };
}

// ─── Sources and search scoping ──────────────────────────────────────────────
//
// Search and chat each take two scoping lists, and they are not interchangeable.
// `apps` holds connector ids; `kb` holds collection (knowledge base) ids. When
// `apps` is set and `kb` is empty, the backend drops every collection id from
// `apps` and searches no collection at all — so a collection id in the wrong
// list silently returns nothing. Both kinds are UUIDs, so only the source
// listing can tell them apart.

export type SourceKind = "knowledgeBase" | "connector";

export interface SourceItem {
  id: string;
  name: string | undefined;
  kind: SourceKind;
  connector: string | undefined;
  hasChildren: boolean | undefined;
}

/** A knowledge-hub root node as a source. Collections carry `connector: "KB"`. */
export function toSource(n: any): SourceItem {
  return {
    id: n?.id,
    name: n?.name,
    kind: n?.connector === "KB" ? "knowledgeBase" : "connector",
    connector: n?.connector,
    hasChildren: n?.hasChildren,
  };
}

/**
 * Fetch every root source (connectors and collections), paginating
 * `GET /knowledgeBase/knowledge-hub/nodes` the same way `listAllAgents` does.
 * A partial listing would let a misplaced id slip past the scope router, so
 * this does not stop at the first page.
 *
 * `reason` is a short cause for callers that report the failure as a note
 * rather than an error — `result` carries the full message, including an auth
 * hint that would mislead inside a search that otherwise succeeded.
 */
export async function listAllSources(
  client: PipeshubCore,
  opts: {
    signal?: AbortSignal | undefined;
    maxPages?: number | undefined;
  } = {},
): Promise<
  | { ok: true; sources: SourceItem[]; truncated: boolean }
  | { ok: false; result: CallToolResult; reason: string }
> {
  const PAGE_SIZE = 200;
  const maxPages = opts.maxPages ?? 5;
  // Only set `signal` when present (exactOptionalPropertyTypes).
  const reqOptions = opts.signal
    ? { fetchOptions: { signal: opts.signal } }
    : {};

  const all: SourceItem[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const [r] = await knowledgeHubGetKnowledgeHubRootNodes(client, {
      page,
      limit: PAGE_SIZE,
    }, reqOptions).$inspect();
    if (!r.ok) {
      return {
        ok: false,
        result: errorResult(`sources: ${r.error.message}`),
        reason: r.error.message,
      };
    }

    const status = r.value.status;
    const httpOk = r.value.ok;
    const parsed = await readJson<{
      items?: any[];
      pagination?: { hasNext?: boolean | null } | null;
    }>(r.value, "Knowledge base listing");
    if (!parsed.ok) {
      return {
        ok: false,
        result: parsed.result,
        reason: httpOk ? "unreadable response" : `HTTP ${status}`,
      };
    }

    const items = parsed.value.items ?? [];
    all.push(...items.map(toSource));

    const hasNext = parsed.value.pagination?.hasNext ?? (items.length >= PAGE_SIZE);
    if (!hasNext || items.length === 0) {
      return { ok: true, sources: all, truncated: false };
    }
  }

  // Hit the page cap with more pages still available.
  return { ok: true, sources: all, truncated: true };
}

const dedupe = (ids: readonly string[]): string[] => [...new Set(ids)];

export interface SourceScope {
  apps: string[];
  kb: string[];
  /** Collection ids that arrived in `apps` and were moved to `kb`. */
  movedToKb: string[];
  /** Connector ids that arrived in `kb` and were moved to `apps`. */
  movedToApps: string[];
}

/**
 * Put each id in the list the backend reads it from, whichever list the
 * caller used. `kinds` maps a source id to what the listing says it is. An id
 * the listing does not know stays where the caller put it. Order is kept:
 * ids from `apps` first, then ids from `kb`. Duplicates collapse.
 */
export function routeSourceScope(
  apps: readonly string[] | undefined,
  kb: readonly string[] | undefined,
  kinds: ReadonlyMap<string, SourceKind>,
): SourceScope {
  const appIds = dedupe(apps ?? []);
  const kbIds = dedupe(kb ?? []);
  const movedToKb = appIds.filter((id) => kinds.get(id) === "knowledgeBase");
  const movedToApps = kbIds.filter((id) => kinds.get(id) === "connector");
  return {
    apps: dedupe([
      ...appIds.filter((id) => kinds.get(id) !== "knowledgeBase"),
      ...movedToApps,
    ]),
    kb: dedupe([
      ...movedToKb,
      ...kbIds.filter((id) => kinds.get(id) !== "connector"),
    ]),
    movedToKb,
    movedToApps,
  };
}

/** The `filters` body for `POST /search`; omitted when nothing is scoped. */
export function searchFilters(
  scope: { apps: string[]; kb: string[] },
): { apps: string[]; kb: string[] } | undefined {
  if (scope.apps.length === 0 && scope.kb.length === 0) return undefined;
  return { apps: scope.apps, kb: scope.kb };
}

/** Notes telling the model what the router did, or could not do. */
export function sourceScopeNotes(input: {
  movedToKb: string[];
  movedToApps: string[];
  lookupError?: string | undefined;
  unlisted?: string[] | undefined;
}): string[] {
  const notes: string[] = [];
  if (input.movedToKb.length > 0) {
    notes.push(
      `Moved ${input.movedToKb.length} collection id(s) from apps to kb: `
        + `${input.movedToKb.join(", ")}. Collection ids belong in kb.`,
    );
  }
  if (input.movedToApps.length > 0) {
    notes.push(
      `Moved ${input.movedToApps.length} connector id(s) from kb to apps: `
        + `${input.movedToApps.join(", ")}. Connector ids belong in apps.`,
    );
  }
  if (input.lookupError) {
    notes.push(
      "Could not check the ids against the source list "
        + `(${input.lookupError}); sent them unchanged. If this finds nothing, `
        + "check that collection ids are in kb and connector ids in apps.",
    );
  }
  if (input.unlisted && input.unlisted.length > 0) {
    notes.push(
      `Source list was incomplete; ${input.unlisted.join(", ")} were not `
        + "found and were sent unchanged.",
    );
  }
  return notes;
}

/**
 * Route `apps` / `kb` for one request. Every id in either list is checked
 * against the source listing and sent in the list the backend reads it from:
 * collection ids in `kb`, connector ids in `apps`. The lookup costs a request,
 * so it runs only when something is scoped. A failed lookup sends the ids
 * unchanged and says so in `notes`.
 */
export async function resolveSourceScope(
  client: PipeshubCore,
  apps: readonly string[] | undefined,
  kb: readonly string[] | undefined,
  opts: {
    signal?: AbortSignal | undefined;
    maxPages?: number | undefined;
  } = {},
): Promise<{ scope: SourceScope; notes: string[] }> {
  const unchecked = routeSourceScope(apps, kb, new Map());
  if (unchecked.apps.length === 0 && unchecked.kb.length === 0) {
    return { scope: unchecked, notes: [] };
  }

  const listed = await listAllSources(client, opts);
  if (!listed.ok) {
    return {
      scope: unchecked,
      notes: sourceScopeNotes({
        movedToKb: [],
        movedToApps: [],
        lookupError: listed.reason,
      }),
    };
  }

  const kinds = new Map(listed.sources.map((s) => [s.id, s.kind] as const));
  const scope = routeSourceScope(apps, kb, kinds);
  const unlisted = listed.truncated
    ? [...scope.apps, ...scope.kb].filter((id) => !kinds.has(id))
    : [];
  return {
    scope,
    notes: sourceScopeNotes({
      movedToKb: scope.movedToKb,
      movedToApps: scope.movedToApps,
      unlisted,
    }),
  };
}

