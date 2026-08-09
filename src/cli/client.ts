// A minimal MCP client over HTTP for the `pipeshub` CLI.
//
// PipesHub's `/mcp` endpoint is a stateless bearer pass-through: a single POST
// carrying a JSON-RPC request returns a JSON-RPC response framed as one SSE
// `message` event. No `initialize` handshake is needed, so this deliberately
// does not pull in the MCP SDK's session machinery — one fetch and a small
// frame parser is the whole client.

import { randomUUID } from "node:crypto";
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
  if (/\b401\b|unautheni?ticated|no token provided/i.test(message)) {
    return EXIT.UNAUTHENTICATED;
  }
  if (/\b403\b|not have permission|forbidden/i.test(message)) {
    return EXIT.FORBIDDEN;
  }
  if (/\b429\b|rate.?limit/i.test(message)) return EXIT.RATE_LIMITED;
  return EXIT.ERROR;
}

/** Pull the JSON-RPC payload out of an SSE body. */
function parseSseFrames(body: string): unknown {
  const dataLines: string[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  const joined = dataLines.join("\n").trim();
  const source = joined !== "" ? joined : body.trim();
  if (source === "") {
    throw new CliError("empty response from the MCP endpoint");
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new CliError(
      `could not parse the MCP response as JSON: ${source.slice(0, 200)}`,
    );
  }
}

export async function callTool(
  opts: ClientOptions,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  assertTransport(opts.origin, opts.insecureHttp);
  const url = mcpEndpoint(opts.origin);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${opts.token}`,
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
        // QM provides no turn or trace identifier in the sandbox environment,
        // so correlation has to start here. Echoed back in the JSON output.
        "x-pipeshub-request-id": opts.requestId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 180_000),
    });
  } catch (e: unknown) {
    const err = e as Error;
    const detail = err.name === "TimeoutError"
      ? "request timed out"
      : err.message;
    throw new CliError(`could not reach ${url}: ${detail}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new CliError(
      `MCP request failed (HTTP ${response.status} ${response.statusText})`
        + (text ? `: ${text.slice(0, 300)}` : ""),
      statusToExit(response.status),
    );
  }

  const payload = parseSseFrames(await response.text()) as {
    error?: { message?: string };
    result?: {
      isError?: boolean;
      content?: Array<{ type: string; text?: string }>;
    };
  };

  if (payload.error) {
    throw new CliError(
      `MCP error: ${payload.error.message ?? "unknown"}`,
    );
  }
  const result = payload.result;
  if (!result) throw new CliError("MCP response contained no result");

  const text = (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");

  if (result.isError) {
    throw new CliError(text || "tool reported an error", toolErrorToExit(text));
  }
  return text;
}

/**
 * `tools/list` — used as a liveness probe by `auth status`. It needs a valid
 * bearer but no particular scope, so it distinguishes "token works" from
 * "token lacks a scope" in a way that calling a real tool cannot.
 */
export async function listTools(opts: ClientOptions): Promise<string[]> {
  assertTransport(opts.origin, opts.insecureHttp);
  const url = mcpEndpoint(opts.origin);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${opts.token}`,
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
        "x-pipeshub-request-id": opts.requestId,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
  } catch (e: unknown) {
    throw new CliError(`could not reach ${url}: ${(e as Error).message}`);
  }
  if (!response.ok) {
    throw new CliError(
      `MCP request failed (HTTP ${response.status} ${response.statusText})`,
      statusToExit(response.status),
    );
  }
  const payload = parseSseFrames(await response.text()) as {
    result?: { tools?: Array<{ name?: string }> };
  };
  return (payload.result?.tools ?? [])
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
