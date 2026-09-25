import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createServer, type Server, type Socket } from "node:net";
import type { AddressInfo } from "node:net";
import { PipeshubCore } from "../src/core.js";
import { semanticSearchSearch } from "../src/funcs/semanticSearchSearch.js";
import { HTTPClient, type ResponseHook } from "../src/lib/http.js";
import type { RetryConfig } from "../src/lib/retries.js";
import { httpErrorResult } from "../src/mcp-server/tools/_helpers.js";
import {
  ConnectionError,
  RequestAbortedError,
  RequestTimeoutError,
} from "../src/models/errors/httpclienterrors.js";

// What `start` and `serve` go through for every tool call: a generated
// operation, the retry loop, and the HTTPClient, talking to PipesHub. The
// earlier tests drove these with an in-memory fetcher; here the other end is a
// real HTTP server on loopback, so status lines, Retry-After, redirects, resets
// and timeouts are the real thing. Nothing leaves 127.0.0.1.

const TOKEN = "sdk-layer-token-0000";

interface Seen {
  at: number;
  method: string;
  path: string;
  authorization: string | null;
  trace: string | null;
  body: string;
}

type Step = () => Response | Promise<Response>;

let steps: Step[] = [];
let seen: Seen[] = [];
let api: ReturnType<typeof Bun.serve>;
let other: ReturnType<typeof Bun.serve>;
let otherSeen: Seen[] = [];

async function record(req: Request, into: Seen[]): Promise<void> {
  into.push({
    at: Date.now(),
    method: req.method,
    path: new URL(req.url).pathname,
    authorization: req.headers.get("authorization"),
    trace: req.headers.get("x-trace"),
    body: await req.text(),
  });
}

beforeAll(() => {
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      await record(req, seen);
      const step = steps[Math.min(seen.length - 1, steps.length - 1)];
      return step ? step() : Response.json({});
    },
  });
  other = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      await record(req, otherSeen);
      return Response.json({ searchResults: [] });
    },
  });
});

afterAll(() => {
  api.stop(true);
  other.stop(true);
});

beforeEach(() => {
  steps = [];
  seen = [];
  otherSeen = [];
});

const apiOrigin = () => `http://127.0.0.1:${api.port}`;

const backoff = (over: Partial<{
  initialInterval: number;
  maxInterval: number;
  exponent: number;
  maxElapsedTime: number;
}> = {}, retryConnectionErrors = false): RetryConfig => ({
  strategy: "backoff",
  backoff: { initialInterval: 5, maxInterval: 20, exponent: 1, maxElapsedTime: 5_000, ...over },
  retryConnectionErrors,
});

function client(over: ConstructorParameters<typeof PipeshubCore>[0] = {}): PipeshubCore {
  return new PipeshubCore({
    serverURL: `${apiOrigin()}/api/v1`,
    security: { bearerAuth: TOKEN },
    ...over,
  });
}

const search = (c: PipeshubCore, options?: Parameters<typeof semanticSearchSearch>[2]) =>
  semanticSearchSearch(c, { query: "quarterly report" }, options);

const ok = () => Response.json({ searchResults: [] });
const status = (code: number, headers: Record<string, string> = {}, body = "busy") => () =>
  new Response(body, { status: code, headers });

describe("retries against a live server", () => {
  test("a 429 is retried after the Retry-After wait, with the same bearer and body", async () => {
    steps = [status(429, { "retry-after": "1" }), ok];

    // Retry-After asks for 1 s; maxInterval caps it at 60 ms.
    const res = await search(client({ retryConfig: backoff({ maxInterval: 60 }) }));

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe(200);
    expect(seen).toHaveLength(2);
    expect(seen[1]!.at - seen[0]!.at).toBeGreaterThanOrEqual(50);
    for (const s of seen) {
      expect(s.authorization).toBe(`Bearer ${TOKEN}`);
      expect(JSON.parse(s.body)).toEqual({ query: "quarterly report", limit: 10 });
    }
  });

  test("each of 500, 502, 503 and 504 is retried", async () => {
    steps = [status(500), status(502), status(503), status(504), ok];

    const res = await search(client({ retryConfig: backoff() }));

    expect(res.ok && res.value.status).toBe(200);
    expect(seen).toHaveLength(5);
  });

  test("a 503 that never clears is handed back once time runs out, and the tool says what failed", async () => {
    steps = [status(503, {}, "upstream busy")];

    const res = await search(client({ retryConfig: backoff({ maxElapsedTime: 80 }) }));

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe(503);
    expect(seen.length).toBeGreaterThan(1);
    const shown = await httpErrorResult(res.value, "PipesHub search");
    expect(shown?.isError).toBe(true);
    expect(shown?.content[0]).toEqual({
      type: "text",
      text: "PipesHub search failed (HTTP 503 Service Unavailable). upstream busy.",
    });
  });

  test("a 401 is not retried, and the tool points at the credential", async () => {
    steps = [status(401, {}, JSON.stringify({ message: "jwt expired" }))];

    const res = await search(client({ retryConfig: backoff() }));

    expect(seen).toHaveLength(1);
    if (!res.ok) throw res.error;
    const shown = await httpErrorResult(res.value, "PipesHub search");
    expect(shown?.content[0]).toMatchObject({
      text: "PipesHub search failed (HTTP 401 Unauthorized). jwt expired. "
        + "Check that the bearer token / credentials are valid and not expired.",
    });
  });

  test("without a retry config a 429 is returned after one request", async () => {
    steps = [status(429, { "retry-after": "1" })];

    const res = await search(client());

    expect(res.ok && res.value.status).toBe(429);
    expect(seen).toHaveLength(1);
  });
});

describe("timeouts and aborts", () => {
  const hang: Step = async () => {
    await Bun.sleep(1_000);
    return ok();
  };

  test("the client's timeoutMs stops a request the server never answers", async () => {
    steps = [hang];
    const started = Date.now();

    const res = await search(client({ timeoutMs: 50 }));

    expect(Date.now() - started).toBeLessThan(900);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBeInstanceOf(RequestTimeoutError);
    expect(res.error.message).toStartWith("Request timed out");
  });

  test("a per-call timeoutMs overrides the client's", async () => {
    steps = [hang];

    const res = await search(client({ timeoutMs: 60_000 }), { timeoutMs: 50 });

    expect(!res.ok && res.error).toBeInstanceOf(RequestTimeoutError);
  });

  test("the caller cancelling is reported as an abort, not a timeout", async () => {
    steps = [hang];
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);

    const res = await search(client({ timeoutMs: 60_000 }), { fetchOptions: { signal: controller.signal } });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBeInstanceOf(RequestAbortedError);
    expect(res.error.message).toStartWith("Request aborted by client");
  });
});

/**
 * A raw TCP server that resets the first `resets` connections and answers the
 * rest with a plain HTTP 200. Bun.serve cannot drop a connection mid-request.
 */
async function flakyServer(resets: number): Promise<{ origin: string; connections: () => number; close: () => void }> {
  let connections = 0;
  const server: Server = createServer((socket: Socket) => {
    connections += 1;
    const n = connections;
    socket.once("data", () => {
      if (n <= resets) {
        socket.resetAndDestroy();
        return;
      }
      const body = JSON.stringify({ searchResults: [] });
      socket.end(
        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\n"
          + `content-length: ${Buffer.byteLength(body)}\r\nconnection: close\r\n\r\n${body}`,
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}`, connections: () => connections, close: () => server.close() };
}

describe("connection failures", () => {
  test("a reset connection is a ConnectionError, and is not retried unless asked", async () => {
    const flaky = await flakyServer(1);
    try {
      const res = await search(client({ serverURL: `${flaky.origin}/api/v1`, retryConfig: backoff() }));

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toBeInstanceOf(ConnectionError);
      expect(res.error.message).toStartWith("Unable to make request");
      expect(flaky.connections()).toBe(1);
    } finally {
      flaky.close();
    }
  });

  test("with retryConnectionErrors a reset connection is tried again and succeeds", async () => {
    const flaky = await flakyServer(2);
    try {
      const res = await search(client({
        serverURL: `${flaky.origin}/api/v1`,
        retryConfig: backoff({}, true),
      }));

      expect(res.ok && res.value.status).toBe(200);
      expect(flaky.connections()).toBe(3);
    } finally {
      flaky.close();
    }
  });
});

describe("redirects", () => {
  test("a same-origin 307 is followed with the bearer and the body", async () => {
    steps = [() => new Response(null, { status: 307, headers: { location: "/api/v1/search-moved" } }), ok];

    const res = await search(client());

    expect(res.ok && res.value.status).toBe(200);
    expect(seen.map((s) => [s.method, s.path])).toEqual([
      ["POST", "/api/v1/search"],
      ["POST", "/api/v1/search-moved"],
    ]);
    expect(seen[1]!.authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(seen[1]!.body)).toEqual({ query: "quarterly report", limit: 10 });
  });

  test("a redirect to another origin does not carry the bearer there", async () => {
    // A different port is a different origin. fetch drops Authorization on a
    // cross-origin hop; this pins it so a hand-rolled redirect follower cannot
    // start handing the token to whatever host a Location header names.
    for (const code of [301, 302, 307, 308]) {
      steps = [() => new Response(null, {
        status: code,
        headers: { location: `http://127.0.0.1:${other.port}/elsewhere` },
      })];
      seen = [];
      otherSeen = [];

      await search(client());

      expect(otherSeen).toHaveLength(1);
      expect(otherSeen[0]!.authorization).toBeNull();
    }
  });
});

describe("HTTPClient hooks", () => {
  // SDK users can pass their own HTTPClient; hooks are how they add tracing or
  // watch traffic. None of the hook plumbing had ever run.

  test("a beforeRequest hook can replace the request, and a response hook sees every attempt", async () => {
    steps = [status(503), ok];
    const statuses: number[] = [];
    const http = new HTTPClient()
      .addHook("beforeRequest", (req) => {
        const next = new Request(req);
        next.headers.set("x-trace", "t-1");
        return next;
      })
      .addHook("beforeRequest", () => undefined)
      .addHook("response", (res) => void statuses.push(res.status));

    const res = await search(client({ httpClient: http, retryConfig: backoff() }));

    expect(res.ok && res.value.status).toBe(200);
    expect(statuses).toEqual([503, 200]);
    expect(seen.map((s) => s.trace)).toEqual(["t-1", "t-1"]);
    expect(seen[1]!.authorization).toBe(`Bearer ${TOKEN}`);
  });

  test("a requestError hook sees a network failure, and the caller still gets the error", async () => {
    const flaky = await flakyServer(1);
    const failures: Array<{ url: string; err: unknown }> = [];
    try {
      const http = new HTTPClient().addHook("requestError", (err, req) => {
        failures.push({ url: req.url, err });
      });

      const res = await search(client({ serverURL: `${flaky.origin}/api/v1`, httpClient: http }));

      expect(!res.ok && res.error).toBeInstanceOf(ConnectionError);
      expect(failures).toHaveLength(1);
      expect(failures[0]!.url).toBe(`${flaky.origin}/api/v1/search`);
    } finally {
      flaky.close();
    }
  });

  test("removeHook stops a hook, and a clone keeps the hooks it was made with", async () => {
    steps = [ok];
    const calls: string[] = [];
    const first: ResponseHook = () => void calls.push("first");
    const second: ResponseHook = () => void calls.push("second");
    const http = new HTTPClient().addHook("response", first);
    const copy = http.clone();
    http.addHook("response", second).removeHook("response", first);
    // Removing a hook that was never added is not an error.
    http.removeHook("beforeRequest", () => undefined).removeHook("requestError", () => undefined);

    await search(client({ httpClient: http }));
    expect(calls).toEqual(["second"]);

    calls.length = 0;
    await search(client({ httpClient: copy }));
    expect(calls).toEqual(["first"]);
  });

  test("an unknown hook name is refused", () => {
    const http = new HTTPClient();
    const addHook = http.addHook.bind(http) as (hook: string, fn: () => void) => HTTPClient;
    const removeHook = http.removeHook.bind(http) as (hook: string, fn: () => void) => HTTPClient;
    expect(() => addHook("afterEverything", () => undefined)).toThrow("Invalid hook type: afterEverything");
    expect(() => removeHook("afterEverything", () => undefined)).toThrow("Invalid hook type: afterEverything");
  });
});

describe("debug logging across retries", () => {
  test("every attempt is logged and none of them shows the token", async () => {
    steps = [status(429, { "retry-after": "1" }), ok];
    const lines: string[] = [];
    const log = (...args: unknown[]) => void lines.push(args.map(String).join(" "));

    await search(client({
      retryConfig: backoff({ maxInterval: 10 }),
      debugLogger: { log, group: (label?: string) => log(label ?? ""), groupEnd: () => undefined },
    }));

    const text = lines.join("\n");
    expect(lines.filter((l) => l.startsWith("> Request: POST"))).toHaveLength(2);
    expect(lines.filter((l) => l === "authorization: [redacted]")).toHaveLength(2);
    expect(text).toContain("Status Code: 429");
    expect(text).toContain("Status Code: 200");
    expect(text).not.toContain(TOKEN);
  });
});
