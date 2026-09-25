// Retries and a timeout for every PipesHub request the SDK makes.
//
// The generated SDK retries nothing and times out nothing unless the caller
// passes `retryConfig` / `timeoutMs`, and `start` / `serve` pass neither, so a
// 429 or a 503 reached the model after one try and a hung backend call never
// ended. This installs both around whatever HTTP client the SDK was given.

import { SDKOptions } from "../lib/config.js";
import { HTTPClient } from "../lib/http.js";
import { SDKInitHook } from "./types.js";

export interface TransportSettings {
  /** Tries per request, the first one included. 1 turns retries off. */
  maxAttempts: number;
  /** How long to wait for a response to start. 0 turns the timeout off. */
  timeoutMs: number;
}

export const DEFAULT_TRANSPORT: TransportSettings = {
  maxAttempts: 3,
  timeoutMs: 60_000,
};

export const MAX_ATTEMPTS_ENV = "PIPESHUB_MCP_MAX_ATTEMPTS";
export const TIMEOUT_ENV = "PIPESHUB_MCP_TIMEOUT_MS";

/** Statuses that say "try again later" rather than "this request is wrong". */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

// The SDK marks no operation as idempotent, so the HTTP method decides
// (RFC 9110 §9.2.2). POST is never retried: search writes a history entry and
// chat starts a conversation, so a repeat is a second search or a second answer.
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

/** A Retry-After longer than this is handed back rather than waited out. */
const MAX_RETRY_AFTER_MS = 30_000;

const BACKOFF_BASE_MS = 500;

function readWholeNumber(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
  expected: string,
): number {
  const raw = (env[name] ?? "").trim();
  if (raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be ${expected} (got "${raw}").`);
  }
  return value;
}

export function transportSettingsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TransportSettings {
  return {
    maxAttempts: readWholeNumber(
      env,
      MAX_ATTEMPTS_ENV,
      DEFAULT_TRANSPORT.maxAttempts,
      1,
      10,
      "a whole number from 1 to 10; 1 turns retries off",
    ),
    timeoutMs: readWholeNumber(
      env,
      TIMEOUT_ENV,
      DEFAULT_TRANSPORT.timeoutMs,
      0,
      3_600_000,
      "a whole number of milliseconds up to 3600000; 0 turns the timeout off",
    ),
  };
}

/** Milliseconds to wait before the next try, or null to stop and hand back `res`. */
function retryDelayMs(res: Response, attempt: number): number | null {
  const header = res.headers.get("retry-after")?.trim() ?? "";
  if (header !== "") {
    const seconds = Number(header);
    const ms = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    if (!Number.isNaN(ms)) {
      return ms > MAX_RETRY_AFTER_MS ? null : Math.max(0, ms);
    }
  }
  return BACKOFF_BASE_MS * 2 ** (attempt - 1) + Math.random() * 250;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * `req` with a different signal. Rebuilt from its parts because Bun hangs on
 * `new Request(req, { signal })` when the body is a stream.
 */
function withSignal(req: Request, signal: AbortSignal): Request {
  const init: RequestInit = {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: req.redirect,
    signal,
  };
  if (req.body !== null) Object.assign(init, { duplex: "half" });
  return new Request(req.url, init);
}

/**
 * One try, abandoned if no response has started within `timeoutMs`. Only the
 * wait for the response is timed: a chat answer may stream for longer than
 * that once it has begun.
 */
async function attempt(
  inner: HTTPClient,
  req: Request,
  timeoutMs: number,
): Promise<Response> {
  if (timeoutMs <= 0) return inner.request(req);
  const timer = new AbortController();
  const handle = setTimeout(() => {
    timer.abort(new DOMException(
      `PipesHub did not start answering within ${timeoutMs / 1000} s`,
      "TimeoutError",
    ));
  }, timeoutMs);
  try {
    return await inner.request(
      withSignal(req, AbortSignal.any([req.signal, timer.signal])),
    );
  } finally {
    clearTimeout(handle);
  }
}

async function send(
  inner: HTTPClient,
  req: Request,
  settings: TransportSettings,
): Promise<Response> {
  const tries = IDEMPOTENT_METHODS.has(req.method.toUpperCase())
    ? settings.maxAttempts
    : 1;
  for (let n = 1; ; n++) {
    const last = n >= tries;
    const res = await attempt(inner, last ? req : req.clone(), settings.timeoutMs);
    if (last || !RETRYABLE_STATUSES.has(res.status)) return res;
    const wait = retryDelayMs(res, n);
    if (wait === null) return res;
    await res.body?.cancel().catch(() => undefined);
    await sleep(wait, req.signal);
  }
}

/** An HTTP client that sends through `inner` with retries and a timeout. */
export function withTransportDefaults(
  inner: HTTPClient,
  settings: TransportSettings,
): HTTPClient {
  return new HTTPClient({
    fetcher: (input, init) =>
      send(
        inner,
        input instanceof Request && init === undefined
          ? input
          : new Request(input, init),
        settings,
      ),
  });
}

export class TransportDefaultsHook implements SDKInitHook {
  sdkInit(opts: SDKOptions): SDKOptions {
    const settings = transportSettingsFromEnv();
    return {
      ...opts,
      httpClient: withTransportDefaults(opts.httpClient ?? new HTTPClient(), {
        // A caller's own retryConfig, even `strategy: "none"`, replaces these
        // retries; running both would multiply the tries.
        maxAttempts: opts.retryConfig ? 1 : settings.maxAttempts,
        timeoutMs: settings.timeoutMs,
      }),
    };
  }
}
