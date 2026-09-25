import { afterEach, beforeEach, describe, expect, setSystemTime, spyOn, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { semanticSearchSearch } from "../src/funcs/semanticSearchSearch.js";
import { HTTPClient } from "../src/lib/http.js";
import { retry, type RetryConfig } from "../src/lib/retries.js";

// `retry` decides whether a failed call is tried again, how long to wait, and
// when to give up and hand back the failure. Every generated operation goes
// through it. It was 18% covered, so none of those decisions were pinned.
//
// The clock is virtual: setTimeout resolves at once and records the delay it
// was asked for, and Date.now advances by that delay. Jitter is pinned to zero.

const T0 = Date.parse("2026-01-01T00:00:00Z");
let delays: number[] = [];
let realSetTimeout: typeof setTimeout;
let random: ReturnType<typeof spyOn>;

beforeEach(() => {
  delays = [];
  let now = T0;
  setSystemTime(now);
  realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, ms: number) => {
    delays.push(ms);
    now += ms;
    setSystemTime(now);
    queueMicrotask(fn);
    return 0;
  }) as unknown as typeof setTimeout;
  random = spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  globalThis.setTimeout = realSetTimeout;
  random.mockRestore();
  setSystemTime();
});

const backoff = (over: Partial<Extract<RetryConfig, { strategy: "backoff" }>> = {}): RetryConfig => ({
  strategy: "backoff",
  backoff: { initialInterval: 500, maxInterval: 60_000, exponent: 1.5, maxElapsedTime: 3_600_000 },
  ...over,
});

const codes = ["429", "5XX"];

/** A fetch that answers from a script, one entry per attempt. */
function scripted(steps: Array<number | Response | Error>) {
  let calls = 0;
  const fn = async () => {
    const step = steps[Math.min(calls, steps.length - 1)]!;
    calls += 1;
    if (step instanceof Error) throw step;
    return step instanceof Response ? step : new Response(`status ${step}`, { status: step });
  };
  return { fn, calls: () => calls };
}

describe("retry: which responses are retried", () => {
  test("strategy none makes exactly one attempt and returns what came back", async () => {
    const f = scripted([503, 200]);
    const res = await retry(f.fn, { config: { strategy: "none" }, statusCodes: codes });

    expect(res.status).toBe(503);
    expect(f.calls()).toBe(1);
  });

  test("a retryable status is retried until it succeeds", async () => {
    const f = scripted([503, 429, 200]);
    const res = await retry(f.fn, { config: backoff(), statusCodes: codes });

    expect(res.status).toBe(200);
    expect(f.calls()).toBe(3);
  });

  test("a status family like 5XX matches any code in it, in either case", async () => {
    for (const family of ["5XX", "5xx"]) {
      const f = scripted([502, 200]);
      const res = await retry(f.fn, { config: backoff(), statusCodes: [family] });
      expect(res.status).toBe(200);
      expect(f.calls()).toBe(2);
    }
  });

  test("a status that is not listed is returned at once, not retried", async () => {
    for (const status of [400, 401, 404]) {
      const f = scripted([status, 200]);
      const res = await retry(f.fn, { config: backoff(), statusCodes: codes });
      expect(res.status).toBe(status);
      expect(f.calls()).toBe(1);
    }
  });
});

describe("retry: thrown errors", () => {
  // The shapes fetch itself throws, which is what `retry` sees.
  const refused = () => new TypeError("fetch failed");
  const timedOut = () => new DOMException("The operation timed out.", "TimeoutError");

  test("connection and timeout errors are retried only when asked to", async () => {
    for (const make of [refused, timedOut]) {
      const on = scripted([make(), 200]);
      const res = await retry(on.fn, {
        config: backoff({ retryConnectionErrors: true }),
        statusCodes: codes,
      });
      expect(res.status).toBe(200);
      expect(on.calls()).toBe(2);

      const err = make();
      const off = scripted([err, 200]);
      await expect(retry(off.fn, { config: backoff(), statusCodes: codes })).rejects.toBe(err);
      expect(off.calls()).toBe(1);
    }
  });

  test("any other error stops at once and surfaces unwrapped", async () => {
    const boom = new TypeError("bad input");
    const f = scripted([boom, 200]);

    await expect(
      retry(f.fn, { config: backoff({ retryConnectionErrors: true }), statusCodes: codes }),
    ).rejects.toBe(boom);
    expect(f.calls()).toBe(1);
  });
});

describe("retry: how long it waits", () => {
  test("waits grow exponentially and are capped at maxInterval", async () => {
    const f = scripted([503, 503, 503, 503, 200]);
    await retry(f.fn, {
      config: backoff({
        backoff: { initialInterval: 500, maxInterval: 3_000, exponent: 2, maxElapsedTime: 3_600_000 },
      }),
      statusCodes: codes,
    });

    // initialInterval * attempt^exponent, capped. The attempt counter starts at
    // 0, so the first retry waits only the jitter (0 here, up to 1s in real
    // use), not initialInterval. That is the upstream Speakeasy behaviour.
    expect(delays).toEqual([0, 500, 2_000, 3_000]);
  });

  test("Retry-After in seconds is honoured instead of the backoff", async () => {
    const f = scripted([
      new Response(null, { status: 429, headers: { "retry-after": "7" } }),
      200,
    ]);
    await retry(f.fn, { config: backoff(), statusCodes: codes });

    expect(delays).toEqual([7_000]);
  });

  test("Retry-After as an HTTP date waits until that time", async () => {
    const f = scripted([
      new Response(null, {
        status: 503,
        headers: { "retry-after": new Date(T0 + 12_000).toUTCString() },
      }),
      200,
    ]);
    await retry(f.fn, { config: backoff(), statusCodes: codes });

    expect(delays).toEqual([12_000]);
  });

  test("Retry-After is still capped at maxInterval", async () => {
    const f = scripted([
      new Response(null, { status: 429, headers: { "retry-after": "86400" } }),
      200,
    ]);
    await retry(f.fn, { config: backoff(), statusCodes: codes });

    expect(delays).toEqual([60_000]);
  });

  test("an unusable Retry-After falls back to the backoff", async () => {
    for (const value of ["soon", "0", new Date(T0 - 5_000).toUTCString()]) {
      delays = [];
      const f = scripted([
        new Response(null, { status: 429, headers: { "retry-after": value } }),
        new Response(null, { status: 429, headers: { "retry-after": value } }),
        200,
      ]);
      await retry(f.fn, { config: backoff(), statusCodes: codes });
      expect(delays).toEqual([0, 500]);
    }
  });
});

describe("retry: giving up", () => {
  test("after maxElapsedTime the last retryable response is returned, not thrown", async () => {
    const f = scripted([503]);
    const res = await retry(f.fn, {
      config: backoff({
        backoff: { initialInterval: 1_000, maxInterval: 1_000, exponent: 1, maxElapsedTime: 2_500 },
      }),
      statusCodes: codes,
    });

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("status 503");
    // Waits of 0, 1000, 1000, 1000: the fifth failure lands at 3s, past 2.5s.
    expect(f.calls()).toBe(5);
  });

  test("after maxElapsedTime a connection error is thrown", async () => {
    const err = new TypeError("fetch failed");
    const f = scripted([err]);

    await expect(retry(f.fn, {
      config: backoff({
        retryConnectionErrors: true,
        backoff: { initialInterval: 1_000, maxInterval: 1_000, exponent: 1, maxElapsedTime: 1_500 },
      }),
      statusCodes: codes,
    })).rejects.toBe(err);
    expect(f.calls()).toBe(4);
  });
});

describe("retry through a generated operation", () => {
  test("a retried POST resends its body and succeeds", async () => {
    const bodies: string[] = [];
    let n = 0;
    const fetcher = async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).text());
      n += 1;
      return n === 1
        ? new Response("busy", { status: 503 })
        : Response.json({ searchResults: [] });
    };
    const client = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "pat" },
      httpClient: new HTTPClient({ fetcher }),
      retryConfig: backoff(),
    });

    const res = await semanticSearchSearch(client, { query: "quarterly report" });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe(200);
    expect(bodies).toHaveLength(2);
    // Each attempt sends a clone; a consumed body would arrive empty here.
    expect(JSON.parse(bodies[1]!).query).toBe("quarterly report");
    expect(bodies[1]).toBe(bodies[0]!);
  });

  test("without a retry config an operation is attempted once", async () => {
    let n = 0;
    const client = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "pat" },
      httpClient: new HTTPClient({
        fetcher: async () => {
          n += 1;
          return new Response("busy", { status: 503 });
        },
      }),
    });

    const res = await semanticSearchSearch(client, { query: "q" });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe(503);
    expect(n).toBe(1);
  });
});
