//
// Each curated tool fetches a Response from one of the SDK funcs and then
// trims / restructures the body before handing it to the LLM. The helpers
// here keep that work out of the individual tool files.

import * as z from "zod";
import { Security } from "../../models/security.js";
import { PipeshubCore } from "../../core.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { agentsListAgents } from "../../funcs/agentsListAgents.js";
import { connectorGetConnectorStats } from "../../funcs/connectorGetConnectorStats.js";
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

/**
 * Return a CallToolResult holding a single compact JSON text block. The reader
 * is a language model: indentation adds nothing it needs and is paid for on
 * every hit of a large search. The CLI re-parses this text and pretty-prints
 * its own output, so people reading the CLI still get indented JSON.
 */
export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
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
 * The scopes PipesHub says a request was missing, or null when `message` is
 * about something else.
 *
 * PipesHub refuses a token that lacks a route's scope with
 * "Insufficient scope. Required: agent:execute" ("a or b" when either will do).
 * The Node gateway and the Python services word it identically, and the chat
 * stream relays the Python wording unchanged, so this one pattern covers a
 * refusal whether it arrives as an HTTP 403 or inside the stream.
 */
export function requiredScopesFrom(message: string): string[] | null {
  const m = /Insufficient scope\.?\s*Required:\s*([\w:.-]+(?:\s+or\s+[\w:.-]+)*)/i
    .exec(message);
  if (!m?.[1]) return null;
  return m[1].split(/\s+or\s+/i);
}

/**
 * What to tell someone whose token lacks a scope.
 *
 * The token itself is fine, so the usual "check it is valid and not expired"
 * sends them the wrong way. A personal access token's scopes are fixed when it
 * is created (PipesHub can list, create and revoke one, never edit it), so the
 * remedy is a new token. Without this, a model that sees the bare refusal
 * quietly falls back to another tool and the person never learns why.
 */
export function missingScopeAdvice(scopes: string[]): string {
  const named = scopes.map((s) => `\`${s}\``).join(" or ");
  return `The access token is valid but was not granted the ${named} scope `
    + "this needs, and scopes cannot be added to an existing token. Create a "
    + "new personal access token in PipesHub under Developer Settings → "
    + `Personal Access Tokens with ${named} selected, and replace this one `
    + "with it wherever this client reads its token (for the pipeshub CLI, "
    + "`pipeshub auth connect-help` shows where). Tell the user: only they can "
    + "do this, retrying with the current token will fail the same way, and "
    + "the new token must never be pasted into a chat.";
}

/** `message`, followed by what to do when it is a missing-scope refusal. */
export function withScopeAdvice(message: string): string {
  const scopes = requiredScopesFrom(message);
  if (!scopes) return message;
  const reason = message.trim();
  return `${/[.!?]$/.test(reason) ? reason : `${reason}.`} `
    + missingScopeAdvice(scopes);
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
  const missingScopes = response.status === 403
    ? requiredScopesFrom(reason)
    : null;
  const auth = missingScopes
    ? ` ${missingScopeAdvice(missingScopes)}`
    : (response.status === 401 || response.status === 403)
    ? " Check that the bearer token / credentials are valid and not expired."
    : "";
  return errorResult(
    `${context} failed (HTTP ${response.status} ${response.statusText}).`
      + `${detail}${auth}${waitHint(response)}`,
  );
}

/**
 * How long PipesHub asked to be left alone. The transport hands back a
 * Retry-After too long to wait out at once, so the model is the one to wait.
 */
function waitHint(response: Response): string {
  const header = response.headers.get("retry-after")?.trim() ?? "";
  const seconds = header === ""
    ? Number.NaN
    : Number.isFinite(Number(header))
    ? Number(header)
    : (Date.parse(header) - Date.now()) / 1000;
  const wait = Number.isFinite(seconds) && seconds > 0
    ? `PipesHub asked to wait ${Math.ceil(seconds)} s before retrying.`
    : "";
  if (response.status === 429) {
    return ` Rate limited: ${wait ? wait : "wait before retrying."}`;
  }
  return wait ? ` ${wait}` : "";
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

/** Longest snippet a search hit carries. */
export const SNIPPET_MAX_CHARS = 280;

/**
 * Trim a single search hit to what the LLM actually needs.
 *
 * The snippet is the passage, or the block text when there is no string
 * passage, cut to `SNIPPET_MAX_CHARS`. A cut is marked with
 * `snippetTruncated` and the original `contentChars`, so the model does not
 * read a sentence that stops mid-way as everything the source said. A snippet
 * that fits carries neither key.
 */
export function trimSearchHit(hit: any) {
  const md = hit?.metadata ?? {};
  const full = typeof hit?.content === "string" ? hit.content : md.blockText;
  const cut = typeof full === "string" && full.length > SNIPPET_MAX_CHARS;
  return {
    recordId: md.recordId,
    recordName: md.recordName,
    score: hit?.score,
    snippet: cut ? full.slice(0, SNIPPET_MAX_CHARS) : full,
    ...(cut ? { snippetTruncated: true, contentChars: full.length } : {}),
    mimeType: md.mimeType,
    extension: md.extension,
    connector: md.connector,
    webUrl: md.webUrl,
    pageNum: md.pageNum,
  };
}

/** Epoch milliseconds as an ISO 8601 string, or undefined when unusable. */
export function isoFromEpochMs(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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

// ─── Source coverage ─────────────────────────────────────────────────────────
//
// Search and chat find only indexed content. A record that was synced but
// never indexed (automatic indexing off, still queued, failed) is invisible to
// them, and an agent that is not told so reads "nothing found" as "does not
// exist". The per-source counts already exist behind the connector stats
// route; this puts them next to each source.

/** How much of one source search can see. */
export interface SourceCoverage {
  /** Records whose content is indexed, which search and chat can find. */
  indexed: number;
  /** Every record in the source. */
  total: number;
  /**
   * Records that exist but are not indexed, by indexing status
   * (`AUTO_INDEX_OFF`, `QUEUED`, `FAILED`, ...). Statuses with no records are
   * left out; records with no status at all count as `UNKNOWN`.
   */
  notIndexed: Record<string, number>;
}

const INDEXED_STATUS = "COMPLETED";

const count = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

/**
 * Coverage from a `GET /connectors/{id}/stats` body, or `undefined` when the
 * body does not carry the counts.
 */
export function sourceCoverage(body: unknown): SourceCoverage | undefined {
  const stats = (body as any)?.data?.stats;
  const byStatus = stats?.indexingStatus;
  if (
    typeof stats?.total !== "number" || !byStatus
    || typeof byStatus !== "object"
  ) {
    return undefined;
  }
  const total = count(stats.total);
  const indexed = count(byStatus[INDEXED_STATUS]);
  const notIndexed: Record<string, number> = {};
  let counted = indexed;
  for (const [status, n] of Object.entries(byStatus)) {
    if (status === INDEXED_STATUS || count(n) === 0) continue;
    notIndexed[status] = count(n);
    counted += count(n);
  }
  // The backend counts a record with no status in `total` only.
  if (total > counted) notIndexed["UNKNOWN"] = total - counted;
  return { indexed, total, notIndexed };
}

/** Sources whose coverage is fetched in one call; the rest go without. */
export const COVERAGE_SOURCE_LIMIT = 100;
const COVERAGE_CONCURRENCY = 6;

/**
 * Fetch each source's coverage. Never fails the listing: a source whose counts
 * cannot be read has no entry, and `notes` says why.
 */
export async function listSourceCoverage(
  client: PipeshubCore,
  sources: readonly SourceItem[],
  opts: { signal?: AbortSignal | undefined } = {},
): Promise<{ coverage: Map<string, SourceCoverage>; notes: string[] }> {
  // Only set `signal` when present (exactOptionalPropertyTypes).
  const reqOptions = opts.signal
    ? { fetchOptions: { signal: opts.signal } }
    : {};
  const wanted = sources.slice(0, COVERAGE_SOURCE_LIMIT).filter((s) => s.id);
  const coverage = new Map<string, SourceCoverage>();
  // 404 is how the stats route answers a connector the caller can list but
  // not open (team connectors are listed for everyone, their counts only for
  // the creator or an admin); 403 is a collection role below READER. Neither
  // is a scope problem: listing the sources already needed kb:read, and the
  // stats route accepts kb:read or connector:read.
  let denied = 0;
  let unreadable = 0;

  let next = 0;
  const worker = async () => {
    while (next < wanted.length) {
      const source = wanted[next++]!;
      const [r] = await connectorGetConnectorStats(client, {
        connectorId: source.id,
      }, reqOptions).$inspect();
      if (!r.ok) {
        unreadable++;
        continue;
      }
      if (r.value.status === 403 || r.value.status === 404) {
        await r.value.body?.cancel();
        denied++;
        continue;
      }
      const parsed = await readJson(r.value, "Source coverage");
      const c = parsed.ok ? sourceCoverage(parsed.value) : undefined;
      if (c) coverage.set(source.id, c);
      else unreadable++;
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(COVERAGE_CONCURRENCY, wanted.length) },
      worker,
    ),
  );

  const notes: string[] = [];
  if (denied > 0) {
    notes.push(
      `coverage is missing for ${denied} source(s) whose indexing counts `
        + "this account cannot open.",
    );
  }
  if (unreadable > 0) {
    notes.push(`coverage could not be read for ${unreadable} source(s).`);
  }
  if (sources.length > COVERAGE_SOURCE_LIMIT) {
    notes.push(
      `coverage is shown for the first ${COVERAGE_SOURCE_LIMIT} sources only.`,
    );
  }
  return { coverage, notes };
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

