import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { SDKHooks } from "../src/hooks/hooks.js";
import { semanticSearchSearch } from "../src/funcs/semanticSearchSearch.js";
import { usersGetUserById } from "../src/funcs/usersGetUserById.js";
import { RequestAbortedError, RequestTimeoutError } from "../src/models/errors/httpclienterrors.js";

// What `start` and `serve` get with no retry or timeout configured: the SDK
// they build passes neither, so these defaults are all that stands between a
// 503 or a hung backend and the model. A real server on loopback plays
// PipesHub; nothing leaves 127.0.0.1.

const TOKEN = "transport-defaults-token";
const USER_ID = "507f1f77bcf86cd799439011";

interface Seen { at: number; method: string; authorization: string | null }
type Step = () => Response | Promise<Response>;

let steps: Step[] = [];
let seen: Seen[] = [];
let api: ReturnType<typeof Bun.serve>;
const savedEnv = { attempts: process.env["PIPESHUB_MCP_MAX_ATTEMPTS"], timeout: process.env["PIPESHUB_MCP_TIMEOUT_MS"] };

beforeAll(() => {
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    idleTimeout: 30,
    async fetch(req) {
      seen.push({ at: Date.now(), method: req.method, authorization: req.headers.get("authorization") });
      await req.text();
      const step = steps[Math.min(seen.length - 1, steps.length - 1)];
      return step ? step() : Response.json({ _id: USER_ID });
    },
  });
});

afterAll(() => api.stop(true));

beforeEach(() => {
  steps = [];
  seen = [];
  delete process.env["PIPESHUB_MCP_MAX_ATTEMPTS"];
  delete process.env["PIPESHUB_MCP_TIMEOUT_MS"];
});

afterEach(() => {
  for (const [name, value] of [
    ["PIPESHUB_MCP_MAX_ATTEMPTS", savedEnv.attempts],
    ["PIPESHUB_MCP_TIMEOUT_MS", savedEnv.timeout],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const sdk = (over: ConstructorParameters<typeof PipeshubCore>[0] = {}) =>
  new PipeshubCore({
    serverURL: `http://127.0.0.1:${api.port}/api/v1`,
    security: { bearerAuth: TOKEN },
    ...over,
  });

const getUser = (c: PipeshubCore, options?: Parameters<typeof usersGetUserById>[2]) =>
  usersGetUserById(c, { id: USER_ID }, options);

const status = (code: number, headers: Record<string, string> = {}) => () =>
  new Response("busy", { status: code, headers });
const ok = () => Response.json({ _id: USER_ID });

describe("default retries", () => {
  test("a GET that gets a 503 is tried again, with the bearer, and succeeds", async () => {
    steps = [status(503), ok];

    const res = await getUser(sdk());

    expect(res.ok && res.value.status).toBe(200);
    expect(seen.map((s) => [s.method, s.authorization])).toEqual([
      ["GET", `Bearer ${TOKEN}`],
      ["GET", `Bearer ${TOKEN}`],
    ]);
  });

  test("429, 502 and 504 are retried too", async () => {
    for (const code of [429, 502, 504]) {
      steps = [status(code, { "retry-after": "0" }), ok];
      seen = [];

      const res = await getUser(sdk());

      expect(res.ok && res.value.status).toBe(200);
      expect(seen).toHaveLength(2);
    }
  });

  test("Retry-After is waited out before the next try", async () => {
    steps = [status(429, { "retry-after": "1" }), ok];

    await getUser(sdk());

    expect(seen).toHaveLength(2);
    expect(seen[1]!.at - seen[0]!.at).toBeGreaterThanOrEqual(950);
  });

  test("after three tries the last 503 is handed back", async () => {
    steps = [status(503, { "retry-after": "0" })];

    const res = await getUser(sdk());

    expect(res.ok && res.value.status).toBe(503);
    expect(seen).toHaveLength(3);
  });

  test("a Retry-After longer than 30 s is handed back at once instead of waited out", async () => {
    steps = [status(429, { "retry-after": "120" })];

    const res = await getUser(sdk());

    expect(res.ok && res.value.status).toBe(429);
    expect(seen).toHaveLength(1);
  });

  test("a POST is never retried, since a repeat would be a second search", async () => {
    steps = [status(503, { "retry-after": "0" })];

    const res = await semanticSearchSearch(sdk(), { query: "q" });

    expect(res.ok && res.value.status).toBe(503);
    expect(seen).toHaveLength(1);
  });

  test("a 500 or a 401 is not retried", async () => {
    for (const code of [500, 401]) {
      steps = [status(code)];
      seen = [];
      await getUser(sdk());
      expect(seen).toHaveLength(1);
    }
  });

  test("PIPESHUB_MCP_MAX_ATTEMPTS sets the number of tries, and 1 turns retries off", async () => {
    steps = [status(503, { "retry-after": "0" })];
    process.env["PIPESHUB_MCP_MAX_ATTEMPTS"] = "1";
    await getUser(sdk());
    expect(seen).toHaveLength(1);

    seen = [];
    process.env["PIPESHUB_MCP_MAX_ATTEMPTS"] = "2";
    await getUser(sdk());
    expect(seen).toHaveLength(2);
  });

  test("a caller's own retryConfig replaces the default retries", async () => {
    steps = [status(503, { "retry-after": "0" })];

    await getUser(sdk({ retryConfig: { strategy: "none" } }));

    expect(seen).toHaveLength(1);
  });

  test("per-call retries replace the default ones rather than running inside them", async () => {
    // Counted by an SDK hook, which runs once per SDK attempt; the server
    // counts what went over the wire. Stacked, each SDK attempt was three.
    steps = [status(503, { "retry-after": "0" })];
    let sdkAttempts = 0;
    const hooks = new SDKHooks();
    hooks.registerBeforeRequestHook({
      beforeRequest: (_ctx, req) => {
        sdkAttempts += 1;
        return req;
      },
    });

    const res = await getUser(sdk({ hooks } as ConstructorParameters<typeof PipeshubCore>[0]), {
      retries: {
        strategy: "backoff",
        backoff: { initialInterval: 1, maxInterval: 5, exponent: 1, maxElapsedTime: 150 },
        retryConnectionErrors: true,
      },
    });

    expect(res.ok && res.value.status).toBe(503);
    expect(sdkAttempts).toBeGreaterThan(1);
    expect(seen).toHaveLength(sdkAttempts);
    expect(seen.every((s) => s.authorization === `Bearer ${TOKEN}`)).toBe(true);
  });

  test("the marker that switches the default retries off never reaches PipesHub", async () => {
    steps = [ok];
    const headers: string[][] = [];
    const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) {
      headers.push([...req.headers.keys()]);
      return Response.json({ _id: USER_ID });
    } });
    try {
      await getUser(sdk({ serverURL: `http://127.0.0.1:${probe.port}/api/v1` }), {
        retries: { strategy: "backoff", backoff: { initialInterval: 1, maxInterval: 5, exponent: 1, maxElapsedTime: 50 } },
      });
      expect(headers).toHaveLength(1);
      expect(headers[0]!.filter((h) => h.startsWith("x-pipeshub-sdk"))).toEqual([]);
    } finally {
      probe.stop(true);
    }
  });

  test("cancelling during the wait between tries ends the call as an abort", async () => {
    steps = [status(503, { "retry-after": "5" }), ok];
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    const started = Date.now();

    const res = await getUser(sdk(), { fetchOptions: { signal: controller.signal } });

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(!res.ok && res.error).toBeInstanceOf(RequestAbortedError);
    expect(seen).toHaveLength(1);
  });
});

describe("default timeout", () => {
  test("a backend that never answers is abandoned after PIPESHUB_MCP_TIMEOUT_MS", async () => {
    steps = [async () => {
      await Bun.sleep(3_000);
      return ok();
    }];
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "100";
    const started = Date.now();

    // The tools pass their own cancellation signal; the timeout must apply anyway.
    const res = await getUser(sdk(), { fetchOptions: { signal: new AbortController().signal } });

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBeInstanceOf(RequestTimeoutError);
    expect(res.error.message).toContain("PipesHub did not start answering within 0.1 s");
    expect(seen).toHaveLength(1);
  });

  test("an answer that has started streaming is not cut off by the timeout", async () => {
    steps = [() => new Response(new ReadableStream({
      async start(c) {
        c.enqueue(new TextEncoder().encode('{"_id":'));
        await Bun.sleep(400);
        c.enqueue(new TextEncoder().encode(`"${USER_ID}"}`));
        c.close();
      },
    }), { headers: { "content-type": "application/json" } })];
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "100";

    const res = await getUser(sdk());

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(await res.value.json()).toEqual({ _id: USER_ID });
  });

  test("0 turns the timeout off", async () => {
    steps = [async () => {
      await Bun.sleep(300);
      return ok();
    }];
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "0";

    const res = await getUser(sdk());

    expect(res.ok && res.value.status).toBe(200);
  });
});

describe("configuration", () => {
  test("a value that is not a whole number in range is refused in plain words", () => {
    const cases: Array<[string, string, string]> = [
      ["PIPESHUB_MCP_MAX_ATTEMPTS", "0", "PIPESHUB_MCP_MAX_ATTEMPTS must be a whole number from 1 to 10; 1 turns retries off (got \"0\")."],
      ["PIPESHUB_MCP_MAX_ATTEMPTS", "three", "PIPESHUB_MCP_MAX_ATTEMPTS must be a whole number from 1 to 10; 1 turns retries off (got \"three\")."],
      ["PIPESHUB_MCP_TIMEOUT_MS", "1.5", "PIPESHUB_MCP_TIMEOUT_MS must be a whole number of milliseconds up to 3600000; 0 turns the timeout off (got \"1.5\")."],
      ["PIPESHUB_MCP_TIMEOUT_MS", "-1", "PIPESHUB_MCP_TIMEOUT_MS must be a whole number of milliseconds up to 3600000; 0 turns the timeout off (got \"-1\")."],
    ];
    for (const [name, value, message] of cases) {
      delete process.env["PIPESHUB_MCP_MAX_ATTEMPTS"];
      delete process.env["PIPESHUB_MCP_TIMEOUT_MS"];
      process.env[name] = value;
      expect(() => sdk()).toThrow(message);
    }
  });

  test("blank values mean the defaults", async () => {
    process.env["PIPESHUB_MCP_MAX_ATTEMPTS"] = " ";
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "";
    steps = [status(503, { "retry-after": "0" })];

    await getUser(sdk());

    expect(seen).toHaveLength(3);
  });
});
