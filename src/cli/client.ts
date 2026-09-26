// A minimal MCP client over HTTP for the `pipeshub` CLI.
//
// PipesHub's `/mcp` endpoint is a stateless bearer pass-through: a single POST
// carrying a JSON-RPC request returns a JSON-RPC response framed as one SSE
// `message` event. No `initialize` handshake is needed, so this deliberately
// does not pull in the MCP SDK's session machinery — one fetch and a small
// frame parser is the whole client.

import { randomUUID } from "node:crypto";
import { describeFetchFailure } from "../lib/fetch-failure.js";
import { withoutToken } from "../lib/redact.js";
import { CliError, EXIT, assertTransport, mcpEndpoint } from "./config.js";

export interface ClientOptions {
  origin: string;
  token: string;
  insecureHttp: boolean;
  requestId: string;
  timeoutMs?: number;
}

export function newRequestId(): string {
  return randomUUID();
}

/**
 * Map a transport-level HTTP status onto the CLI's exit taxonomy.
 * Anything unrecognised stays a generic error rather than being forced into
 * a code an agent would misread.
 */
function statusToExit(status: number): number {
  if (status === 401) return EXIT.UNAUTHENTICATED;
  if (status === 403) return EXIT.FORBIDDEN;
  if (status === 429) return EXIT.RATE_LIMITED;
  return EXIT.ERROR;
}

/**
 * Tool-level failures do not arrive as HTTP statuses. The MCP layer returns
 * HTTP 200 with `isError: true` and a human-readable string that has the
 * upstream status embedded in it, e.g.
 *
 *   "Get record content failed (HTTP 403 Forbidden). You do not have permission…"
 *
 * so recovering the code means reading the message. This is pattern matching on
 * prose and it is fragile by nature — it is anchored on the parenthesised
 * "(HTTP <code>" form the server actually emits, and falls back to a generic
 * error rather than guessing when that form is absent.
 */
export function toolErrorToExit(message: string): number {
  const m = message.match(/\(HTTP\s+(\d{3})/i);
  if (m && m[1] !== undefined) return statusToExit(Number(m[1]));
  // `token expired` / `been revoked` cover the credential failures that are
  // established without an HTTP round-trip — whoami checks the token's own
  // expiry offline, so there is no status code to key off, but "your
  // credential is not valid" is exactly what exit 3 means.
  if (
    /\b401\b|unautheni?ticated|no token provided|token expired|been revoked/i
      .test(message)
  ) {
    return EXIT.UNAUTHENTICATED;
  }
  if (/\b403\b|not have permission|forbidden/i.test(message)) {
    return EXIT.FORBIDDEN;
  }
  if (/\b429\b|rate.?limit/i.test(message)) return EXIT.RATE_LIMITED;
  return EXIT.ERROR;
}

/** True for an object that looks like a JSON-RPC response, not a notification. */
function isJsonRpcResponse(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return "result" in o || "error" in o;
}

/**
 * Pull the JSON-RPC response out of an SSE body.
 *
 * Event boundaries matter. An earlier version concatenated every `data:` line
 * in the body and parsed the result as one document, which works only while the
 * endpoint emits exactly one event. The moment anything else appears on the
 * stream — a keepalive, an MCP progress notification, a second `message` event
 * — the concatenation is not valid JSON and the call fails with a confusing
 * "could not parse the MCP response as JSON".
 *
 * So: split on blank lines, reassemble each event's own `data:` lines (multi-
 * line data is per spec), and take the first event that is actually a response.
 * Notifications are skipped rather than mistaken for the answer.
 */
function parseSseFrames(body: string): unknown {
  const normalized = body.replace(/\r\n/g, "\n");
  const events = normalized.split(/\n\n+/);
  const parsed: unknown[] = [];

  for (const event of events) {
    const dataLines: string[] = [];
    for (const line of event.split("\n")) {
      if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (dataLines.length === 0) continue;
    const source = dataLines.join("\n").trim();
    if (source === "") continue;
    try {
      const value = JSON.parse(source);
      if (isJsonRpcResponse(value)) return value;
      parsed.push(value);
    } catch {
      // Not JSON — a comment or a partial frame. Keep looking.
    }
  }

  // No SSE framing at all: some deployments answer `application/json`.
  const whole = normalized.trim();
  if (whole !== "") {
    try {
      const value = JSON.parse(whole);
      if (isJsonRpcResponse(value)) return value;
    } catch {
      // fall through to the errors below
    }
  }

  if (whole === "") throw new CliError("empty response from the MCP endpoint");
  if (parsed.length > 0) {
    throw new CliError(
      "the MCP endpoint sent no JSON-RPC response — only "
        + `${parsed.length} notification frame(s)`,
    );
  }
  throw new CliError(
    `could not parse the MCP response as JSON: ${whole.slice(0, 200)}`,
  );
}

/** One MCP content block, as far as this CLI cares about it. */
export interface ContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: { uri?: string; mimeType?: string; blob?: string; text?: string };
}

// The next steps below say what qm/TROUBLESHOOTING.md says for each case.
const UNREACHABLE_NEXT_STEP = "Check that PIPESHUB_BASE_URL is your PipesHub "
  + "instance's address and that it is reachable from here. From a sandbox, "
  + "localhost and LAN addresses are not.";
const TIMED_OUT_NEXT_STEP = "PipesHub did not answer in time. Try again; if it "
  + "keeps timing out, the instance may be overloaded.";

/** What to do about an HTTP refusal from the MCP endpoint, in one line. */
function nextStepForStatus(response: Response, requestId: string): string {
  const report = `quote request id ${requestId} to whoever runs the instance.`;
  const status = response.status;
  if (status === 401) {
    return "PipesHub rejected the token: it may be expired, revoked, or made "
      + "for a different instance. Run 'pipeshub auth status' to see its "
      + "expiry, and 'pipeshub auth connect-help' to set up a new one.";
  }
  if (status === 403) {
    return "The person this token belongs to cannot access this. Another "
      + "command will not get around it.";
  }
  if (status === 429) {
    const seconds = Number(response.headers.get("retry-after") ?? "");
    return Number.isInteger(seconds) && seconds > 0
      ? `PipesHub is rate limiting this token and asked to wait ${seconds} `
        + "seconds. Wait, then retry once."
      : "PipesHub is rate limiting this token. Wait a little, then retry once.";
  }
  if (status === 404) {
    return "Nothing answers at /mcp there. Check that PIPESHUB_BASE_URL is "
      + "your PipesHub instance's address.";
  }
  if (status >= 500) {
    return "PipesHub could not answer just now. Try again shortly; if it "
      + `keeps failing, ${report}`;
  }
  return `If this keeps happening, ${report}`;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

/**
 * Why a redirect to another origin is not followed, and what to set instead.
 * Only origin and path are shown: a sign-in redirect carries state in its query.
 * The target is offered as the new base URL only when it is the same host on
 * another scheme or port (http to https): anything else would have the next
 * command send the token to whichever host the redirect named.
 */
function redirectedElsewhere(from: string, to: URL, token: string): string {
  const shown = withoutToken(`${to.origin}${to.pathname}`, token);
  const sameHost = new URL(from).hostname === to.hostname;
  const advice = sameHost && /\/mcp\/?$/.test(to.pathname)
    ? `. Set PIPESHUB_BASE_URL to ${withoutToken(to.origin, token)}.`
    : ", which is not this instance's MCP endpoint: something, often a "
      + "sign-in page or a proxy, is in front of PipesHub. Set "
      + "PIPESHUB_BASE_URL to the address PipesHub itself answers on.";
  return `The server at ${from} redirected to ${shown}${advice} `
    + "The token was not sent there.";
}

/**
 * One JSON-RPC request to `{origin}/mcp`, returning its `result`.
 *
 * `tools/call` and the `tools/list` probe behind `auth status` both go through
 * here, so every command reports a timeout, an HTTP refusal and the server's
 * reason for it the same way.
 */
async function postMcp(
  opts: ClientOptions,
  rpc: { method: string; params?: Record<string, unknown> },
  defaultTimeoutMs: number,
): Promise<unknown> {
  assertTransport(opts.origin, opts.insecureHttp);
  const url = mcpEndpoint(opts.origin);
  const init: RequestInit = {
    method: "POST",
    headers: {
      "authorization": `Bearer ${opts.token}`,
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      // QM provides no turn or trace identifier in the sandbox environment,
      // so correlation has to start here. Echoed back in the JSON output.
      "x-pipeshub-request-id": opts.requestId,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...rpc }),
    // Redirects are handled below: fetch would carry the POST to another
    // origin without the bearer, and turn it into a GET on a 301 or 302.
    redirect: "manual",
    signal: AbortSignal.timeout(opts.timeoutMs ?? defaultTimeoutMs),
  };

  let response: Response;
  let target = url;
  for (let hop = 0; ; hop++) {
    try {
      response = await fetch(target, init);
    } catch (e: unknown) {
      const timedOut = (e as Error).name === "TimeoutError";
      const detail = timedOut ? "request timed out" : describeFetchFailure(e);
      throw new CliError(
        `could not reach ${url}: ${detail}\n`
          + (timedOut ? TIMED_OUT_NEXT_STEP : UNREACHABLE_NEXT_STEP),
      );
    }
    const location = REDIRECT_STATUSES.has(response.status)
      ? response.headers.get("location")
      : null;
    if (location === null) break;
    const next = new URL(location, target);
    const from = new URL(url).origin;
    if (next.origin !== from) {
      throw new CliError(redirectedElsewhere(from, next, opts.token), EXIT.USAGE);
    }
    // 303 means "GET this other resource". Replaying the POST could run the
    // call twice, and a JSON-RPC call has no GET form, so it is not followed.
    // 301 and 302 keep the POST, which RFC 9110 allows (the switch to GET is
    // a historical browser habit), for the usual `/mcp` to `/mcp/` move.
    if (response.status === 303) {
      throw new CliError(
        `${url} answered 303 See Other, pointing at `
          + `${withoutToken(`${next.origin}${next.pathname}`, opts.token)}. `
          + "pipeshub does not follow it: a 303 asks for a GET, and sending "
          + "the request again could run it twice. Check that "
          + "PIPESHUB_BASE_URL is the address PipesHub itself answers on.",
      );
    }
    if (hop >= MAX_REDIRECTS) {
      throw new CliError(
        `${url} redirected more than ${MAX_REDIRECTS} times; check the proxy `
          + "in front of PipesHub.",
      );
    }
    await response.body?.cancel();
    target = next.href;
  }

  if (!response.ok) {
    const text = withoutToken(await response.text().catch(() => ""), opts.token);
    throw new CliError(
      `MCP request failed (HTTP ${response.status} ${response.statusText})`
        + (text ? `: ${text.slice(0, 300)}` : "")
        + `\n${nextStepForStatus(response, opts.requestId)}`,
      statusToExit(response.status),
    );
  }

  const payload = parseSseFrames(
    withoutToken(await response.text(), opts.token),
  ) as {
    error?: { message?: string };
    result?: unknown;
  };
  // A JSON-RPC error, or a reply with no result, is a failure. Read as an
  // empty tool list, either one made `auth status` report a working connection.
  if (payload.error) {
    throw new CliError(`MCP error: ${payload.error.message ?? "unknown"}`);
  }
  if (!payload.result) throw new CliError("MCP response contained no result");
  return payload.result;
}

/**
 * `tools/call`, returning every content block.
 *
 * `callTool` folds these to text, which is right for the JSON-returning tools
 * but silently discards binary. `pipeshub get --out` needs the raw blocks.
 */
export async function callToolBlocks(
  opts: ClientOptions,
  name: string,
  args: Record<string, unknown>,
): Promise<ContentBlock[]> {
  const result = await postMcp(
    opts,
    { method: "tools/call", params: { name, arguments: args } },
    180_000,
  ) as { isError?: boolean; content?: ContentBlock[] };

  const blocks = result.content ?? [];

  if (result.isError) {
    const text = joinText(blocks);
    throw new CliError(text || "tool reported an error", toolErrorToExit(text));
  }
  return blocks;
}

/** Concatenate the text blocks, ignoring binary ones. */
export function joinText(blocks: ContentBlock[]): string {
  return blocks
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");
}

/** `tools/call` for the tools that answer with JSON in a text block. */
export async function callTool(
  opts: ClientOptions,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return joinText(await callToolBlocks(opts, name, args));
}

/**
 * `tools/list` — used as a liveness probe by `auth status`. It needs a valid
 * bearer but no particular scope, so it distinguishes "token works" from
 * "token lacks a scope" in a way that calling a real tool cannot.
 */
export async function listTools(opts: ClientOptions): Promise<string[]> {
  const result = await postMcp(opts, { method: "tools/list" }, 30_000) as {
    tools?: Array<{ name?: string }>;
  };
  return (result.tools ?? [])
    .map((t) => t.name)
    .filter((n): n is string => typeof n === "string");
}

/** Tool results are JSON-encoded inside a text block; decode when possible. */
export function decodeToolJson(text: unknown): unknown {
  if (typeof text !== "string") return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
