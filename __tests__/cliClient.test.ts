import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import {
  callTool,
  callToolBlocks,
  decodeToolJson,
  listTools,
  type ClientOptions,
} from "../src/cli/client.js";
import { authStatus } from "../src/cli/commands.js";
import { CliError, EXIT } from "../src/cli/config.js";

// The `pipeshub` CLI's whole network surface: one POST to `{origin}/mcp`, an SSE
// or JSON body back, and a mapping from what went wrong to an exit code agents
// branch on (AGENTS.md: 3 unauthenticated, 4 forbidden, 5 rate-limited). It ran
// only through toolErrorToExit; the transport itself was 14% covered.
//
// This runs against a real HTTP server on loopback, so fetch, headers, status
// lines and body framing are the real thing. Each test sets the reply.

type Reply = {
  status?: number;
  body: string;
  contentType?: string;
  delayMs?: number;
  headers?: Record<string, string>;
};

interface Seen { method: string; path: string; headers: Headers; body: unknown }

let reply: Reply = { body: "" };
let seen: Seen | null = null;
let requests: Seen[] = [];
let server: ReturnType<typeof Bun.serve>;
let origin: string;

async function recordRequest(req: Request): Promise<Seen> {
  const text = await req.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // A GET after a 301/302 has no body; keep whatever arrived.
  }
  const s = { method: req.method, path: new URL(req.url).pathname, headers: req.headers, body };
  requests.push(s);
  return s;
}

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      seen = await recordRequest(req);
      if (reply.delayMs) await Bun.sleep(reply.delayMs);
      return new Response(reply.body, {
        status: reply.status ?? 200,
        headers: { "content-type": reply.contentType ?? "text/event-stream", ...reply.headers },
      });
    },
  });
  origin = `http://127.0.0.1:${server.port}`;
});

afterAll(() => server.stop(true));

const opts = (over: Partial<ClientOptions> = {}): ClientOptions => ({
  origin,
  token: "tok-123456",
  insecureHttp: false,
  requestId: "req-1",
  ...over,
});

const sse = (...events: unknown[]) =>
  events.map((e) => `event: message\ndata: ${JSON.stringify(e)}\n\n`).join("");

const result = (content: unknown[], isError = false) => ({
  jsonrpc: "2.0",
  id: 1,
  result: { content, ...(isError ? { isError: true } : {}) },
});

/** The message without the next-step line the CLI adds under it. */
const firstLine = (message: string): string => message.split("\n")[0] ?? "";

async function cliError(p: Promise<unknown>): Promise<CliError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(CliError);
    return e as CliError;
  }
  throw new Error("expected a CliError");
}

describe("callToolBlocks request", () => {
  test("posts a tools/call with the bearer and request id", async () => {
    reply = { body: sse(result([{ type: "text", text: "ok" }])) };

    await callToolBlocks(opts(), "pipeshub_search", { query: "q" });

    expect(seen!.headers.get("authorization")).toBe("Bearer tok-123456");
    expect(seen!.headers.get("x-pipeshub-request-id")).toBe("req-1");
    expect(seen!.headers.get("accept")).toContain("text/event-stream");
    expect(seen!.body).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "pipeshub_search", arguments: { query: "q" } },
    });
  });

  test("refuses cleartext to a public host before sending anything", async () => {
    seen = null;
    const err = await cliError(
      callToolBlocks(opts({ origin: "http://pipeshub.example.com" }), "t", {}),
    );
    expect(err.code).toBe(EXIT.USAGE);
    expect(seen).toBeNull();
  });
});

describe("callToolBlocks response framing", () => {
  test("skips notification frames and returns the response's blocks", async () => {
    reply = {
      body: ": keepalive\n\n"
        + sse({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } })
        + sse(result([{ type: "text", text: "a" }, { type: "image", data: "AA==", mimeType: "image/png" }])),
    };

    const blocks = await callToolBlocks(opts(), "t", {});

    expect(blocks).toEqual([
      { type: "text", text: "a" },
      { type: "image", data: "AA==", mimeType: "image/png" },
    ]);
  });

  test("joins an event's multi-line data and accepts CRLF line endings", async () => {
    const json = JSON.stringify(result([{ type: "text", text: "multi" }]), null, 2);
    // A notification first: with CRLF not normalised, the two events would not
    // split apart and their data would run together.
    reply = {
      body: sse({ jsonrpc: "2.0", method: "notifications/progress" }).replace(/\n/g, "\r\n")
        + "event: message\r\n"
        + json.split("\n").map((l) => `data: ${l}`).join("\r\n")
        + "\r\n\r\n",
    };

    expect(await callTool(opts(), "t", {})).toBe("multi");
  });

  test("accepts a plain JSON body with no SSE framing", async () => {
    reply = {
      body: JSON.stringify(result([{ type: "text", text: "plain" }])),
      contentType: "application/json",
    };

    expect(await callTool(opts(), "t", {})).toBe("plain");
  });

  test("callTool keeps text blocks and drops binary ones", async () => {
    reply = {
      body: sse(result([
        { type: "text", text: "one" },
        { type: "image", data: "AA==" },
        { type: "text", text: "two" },
      ])),
    };

    expect(await callTool(opts(), "t", {})).toBe("one\ntwo");
  });

  test("an empty body, only notifications, or garbage each say what was wrong", async () => {
    reply = { body: "" };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message)
      .toBe("empty response from the MCP endpoint");

    reply = { body: sse({ jsonrpc: "2.0", method: "notifications/message" }) };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message)
      .toContain("only 1 notification frame(s)");

    reply = { body: "<html>proxy error</html>", contentType: "text/html" };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message)
      .toContain("could not parse the MCP response as JSON: <html>proxy error</html>");
  });
});

describe("callToolBlocks exit codes", () => {
  test("HTTP 401, 403 and 429 map to their exit codes; anything else is a generic error", async () => {
    const cases: Array<[number, number]> = [
      [401, EXIT.UNAUTHENTICATED],
      [403, EXIT.FORBIDDEN],
      [429, EXIT.RATE_LIMITED],
      [500, EXIT.ERROR],
      [404, EXIT.ERROR],
    ];
    for (const [status, exit] of cases) {
      reply = { status, body: "nope", contentType: "text/plain" };
      const err = await cliError(callToolBlocks(opts(), "t", {}));
      expect(err.code).toBe(exit);
      expect(err.message).toContain(`HTTP ${status}`);
      expect(err.message).toContain(": nope");
    }
  });

  test("a tool error maps through the status embedded in its message", async () => {
    reply = {
      body: sse(result([{ type: "text", text: "Search failed (HTTP 403 Forbidden). No access." }], true)),
    };
    const err = await cliError(callToolBlocks(opts(), "t", {}));
    expect(err.code).toBe(EXIT.FORBIDDEN);
    expect(err.message).toBe("Search failed (HTTP 403 Forbidden). No access.");
  });

  test("a tool error with no text still fails", async () => {
    reply = { body: sse(result([], true)) };
    const err = await cliError(callToolBlocks(opts(), "t", {}));
    expect(err.message).toBe("tool reported an error");
    expect(err.code).toBe(EXIT.ERROR);
  });

  test("a JSON-RPC error and a response with no result are errors", async () => {
    reply = { body: sse({ jsonrpc: "2.0", id: 1, error: { code: -32602, message: "bad params" } }) };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message).toBe("MCP error: bad params");

    reply = { body: sse({ jsonrpc: "2.0", id: 1, result: null }) };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message)
      .toBe("MCP response contained no result");
  });

  test("an unreachable server and a timeout say so", async () => {
    const closed = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") });
    const deadOrigin = `http://127.0.0.1:${closed.port}`;
    closed.stop(true);
    const unreachable = await cliError(callToolBlocks(opts({ origin: deadOrigin }), "t", {}));
    expect(unreachable.message).toStartWith(`could not reach ${deadOrigin}/mcp: `);

    reply = { body: sse(result([])), delayMs: 500 };
    const slow = await cliError(callToolBlocks(opts({ timeoutMs: 50 }), "t", {}));
    expect(firstLine(slow.message)).toBe(`could not reach ${origin}/mcp: request timed out`);
  });
});

describe("listTools", () => {
  test("returns the tool names", async () => {
    reply = {
      body: sse({ jsonrpc: "2.0", id: 1, result: { tools: [{ name: "a" }, { name: "b" }, {}] } }),
    };

    expect(await listTools(opts())).toEqual(["a", "b"]);
    expect((seen!.body as { method: string }).method).toBe("tools/list");
  });

  test("HTTP 401 is exit 3", async () => {
    reply = { status: 401, body: "", contentType: "text/plain" };
    expect((await cliError(listTools(opts()))).code).toBe(EXIT.UNAUTHENTICATED);
  });

  test("a JSON-RPC error is an error, not an empty tool list", async () => {
    // `auth status` treats a successful listTools as "connected". A server
    // that answers tools/list with an error must not read as a working login
    // with zero tools.
    reply = {
      body: sse({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "internal error" } }),
    };
    const err = await cliError(listTools(opts()));
    expect(err.message).toBe("MCP error: internal error");

    const status = await authStatus({ ...opts(), json: true, maxChars: 1000 });
    expect(status.payload["connected"]).toBe(false);
    expect(status.payload["error"]).toBe("MCP error: internal error");
    expect(status.exit).toBe(EXIT.ERROR);
  });

  test("a reply with no result is an error, not an empty tool list", async () => {
    reply = { body: sse({ jsonrpc: "2.0", id: 1, result: null }) };
    const err = await cliError(listTools(opts()));
    expect(err.message).toBe("MCP response contained no result");

    const status = await authStatus({ ...opts(), json: true, maxChars: 1000 });
    expect(status.payload["connected"]).toBe(false);
    expect(status.exit).toBe(EXIT.ERROR);
  });
});

describe("decodeToolJson", () => {
  test("parses JSON text and leaves anything else as it was", () => {
    expect(decodeToolJson('{"a":1}')).toEqual({ a: 1 });
    expect(decodeToolJson("plain words")).toBe("plain words");
    expect(decodeToolJson(undefined)).toBeUndefined();
  });
});

describe("rate limits and server errors", () => {
  // The CLI does not retry: exit 5 is the contract, and the agent calling it
  // decides whether and when to try again. A retry loop in here would hide the
  // rate limit and multiply the load it is reporting.
  test("a 429 is exit 5 after one request, whatever Retry-After says", async () => {
    requests = [];
    reply = { status: 429, body: "slow down", contentType: "text/plain", headers: { "retry-after": "1" } };

    const err = await cliError(callToolBlocks(opts(), "t", {}));

    expect(err.code).toBe(EXIT.RATE_LIMITED);
    expect(firstLine(err.message)).toBe("MCP request failed (HTTP 429 Too Many Requests): slow down");
    expect(requests).toHaveLength(1);
  });

  test("a 502 or 503 is a generic failure after one request, with the server's text", async () => {
    for (const status of [502, 503]) {
      requests = [];
      reply = { status, body: "<html>bad gateway</html>", contentType: "text/html" };

      const err = await cliError(callToolBlocks(opts(), "t", {}));

      expect(err.code).toBe(EXIT.ERROR);
      expect(err.message).toContain(`(HTTP ${status} `);
      expect(firstLine(err.message)).toEndWith(": <html>bad gateway</html>");
      expect(requests).toHaveLength(1);
    }
  });

  test("a long error page is cut to 300 characters", async () => {
    reply = { status: 500, body: "x".repeat(5_000), contentType: "text/plain" };

    const err = await cliError(callToolBlocks(opts(), "t", {}));

    expect(firstLine(err.message)).toBe(`MCP request failed (HTTP 500 Internal Server Error): ${"x".repeat(300)}`);
  });

  test("auth status reports 403 as exit 4 and a 429 as exit 5", async () => {
    reply = { status: 403, body: "", contentType: "text/plain" };
    const forbidden = await authStatus({ ...opts(), json: true, maxChars: 1000 });
    expect(forbidden.exit).toBe(EXIT.FORBIDDEN);
    expect(forbidden.payload["connected"]).toBe(false);

    reply = { status: 429, body: "", contentType: "text/plain" };
    expect((await authStatus({ ...opts(), json: true, maxChars: 1000 })).exit).toBe(EXIT.RATE_LIMITED);
  });
});

describe("redirects", () => {
  let elsewhere: ReturnType<typeof Bun.serve>;
  let elsewhereSeen: Seen[] = [];

  beforeAll(() => {
    elsewhere = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const text = await req.text();
        elsewhereSeen.push({ method: req.method, path: new URL(req.url).pathname, headers: req.headers, body: text });
        return new Response("no token", { status: 401 });
      },
    });
  });

  afterAll(() => elsewhere.stop(true));

  test("a same-origin 307 is followed with the bearer and the request", async () => {
    requests = [];
    let n = 0;
    const moved = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        await recordRequest(req);
        n += 1;
        return n === 1
          ? new Response(null, { status: 307, headers: { location: "/mcp-v2" } })
          : new Response(sse(result([{ type: "text", text: "moved ok" }])), {
            headers: { "content-type": "text/event-stream" },
          });
      },
    });
    try {
      const text = await callTool(opts({ origin: `http://127.0.0.1:${moved.port}` }), "t", { a: 1 });

      expect(text).toBe("moved ok");
      expect(requests.map((r) => [r.method, r.path])).toEqual([["POST", "/mcp"], ["POST", "/mcp-v2"]]);
      expect(requests[1]!.headers.get("authorization")).toBe("Bearer tok-123456");
      expect(requests[1]!.body).toMatchObject({ method: "tools/call", params: { name: "t", arguments: { a: 1 } } });
    } finally {
      moved.stop(true);
    }
  });

  test("a redirect to another origin is reported, and nothing is sent there", async () => {
    // A different port is a different origin. Following the redirect used to
    // land there without the bearer, so the user was told their token was bad.
    for (const status of [301, 302, 303, 307, 308]) {
      elsewhereSeen = [];
      reply = {
        status,
        body: "",
        contentType: "text/plain",
        headers: { location: `http://127.0.0.1:${elsewhere.port}/mcp` },
      };

      const err = await cliError(callToolBlocks(opts(), "t", {}));

      expect(elsewhereSeen).toHaveLength(0);
      expect(err.code).toBe(EXIT.USAGE);
      expect(err.message).toBe(
        `The server at ${origin} redirected to http://127.0.0.1:${elsewhere.port}/mcp. `
          + `Set PIPESHUB_BASE_URL to http://127.0.0.1:${elsewhere.port}. `
          + "The token was not sent there.",
      );
    }
  });

  test("http to https on the same host is a different origin, and says which to use", async () => {
    reply = {
      status: 301,
      body: "",
      contentType: "text/plain",
      headers: { location: `https://127.0.0.1:${server.port}/mcp` },
    };

    const err = await cliError(listTools(opts()));

    expect(err.code).toBe(EXIT.USAGE);
    expect(err.message).toContain(`Set PIPESHUB_BASE_URL to https://127.0.0.1:${server.port}.`);
  });

  test("a redirect to a sign-in page is not offered as the new base URL, and its query is not shown", async () => {
    reply = {
      status: 302,
      body: "",
      contentType: "text/plain",
      headers: { location: "https://sso.example.com/login?state=abc123secret&next=%2Fmcp" },
    };

    const err = await cliError(callToolBlocks(opts(), "t", {}));

    expect(err.code).toBe(EXIT.USAGE);
    expect(err.message).toBe(
      `The server at ${origin} redirected to https://sso.example.com/login, which is not `
        + "this instance's MCP endpoint: something, often a sign-in page or a proxy, is in "
        + "front of PipesHub. Set PIPESHUB_BASE_URL to the address PipesHub itself answers "
        + "on. The token was not sent there.",
    );
  });

  test("a redirect to an /mcp on another host is not offered as the new base URL", async () => {
    // Following that advice would send the token to whatever host the
    // redirect named. Only a change of scheme or port on the same host is.
    for (const target of [
      `http://localhost:${elsewhere.port}/mcp`,
      "https://pipeshub.attacker.example/mcp",
    ]) {
      elsewhereSeen = [];
      reply = { status: 307, body: "", contentType: "text/plain", headers: { location: target } };

      const err = await cliError(callToolBlocks(opts(), "t", {}));

      expect(err.code).toBe(EXIT.USAGE);
      expect(err.message).not.toContain("Set PIPESHUB_BASE_URL to http");
      expect(err.message).toBe(
        `The server at ${origin} redirected to ${target}, which is not this instance's `
          + "MCP endpoint: something, often a sign-in page or a proxy, is in front of "
          + "PipesHub. Set PIPESHUB_BASE_URL to the address PipesHub itself answers on. "
          + "The token was not sent there.",
      );
      expect(elsewhereSeen).toHaveLength(0);
    }
  });

  test("a same-origin 303 is reported, not replayed: the call must not run twice", async () => {
    requests = [];
    reply = { status: 303, body: "", contentType: "text/plain", headers: { location: "/mcp/result/1" } };

    const err = await cliError(callToolBlocks(opts(), "pipeshub_search", { query: "q" }));

    expect(requests.map((r) => [r.method, r.path])).toEqual([["POST", "/mcp"]]);
    expect(err.code).toBe(EXIT.ERROR);
    expect(err.message).toBe(
      `${origin}/mcp answered 303 See Other, pointing at ${origin}/mcp/result/1. `
        + "pipeshub does not follow it: a 303 asks for a GET, and sending the request "
        + "again could run it twice. Check that PIPESHUB_BASE_URL is the address PipesHub "
        + "itself answers on.",
    );
  });

  test("a same-origin 301 or 302 sends the same POST again rather than a GET", async () => {
    for (const status of [301, 302]) {
      requests = [];
      let n = 0;
      const moved = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        async fetch(req) {
          await recordRequest(req);
          n += 1;
          return n === 1
            ? new Response(null, { status, headers: { location: "/mcp/" } })
            : new Response(sse(result([{ type: "text", text: "slash ok" }])), {
              headers: { "content-type": "text/event-stream" },
            });
        },
      });
      try {
        expect(await callTool(opts({ origin: `http://127.0.0.1:${moved.port}` }), "t", {})).toBe("slash ok");
        expect(requests.map((r) => [r.method, r.path])).toEqual([["POST", "/mcp"], ["POST", "/mcp/"]]);
        expect(requests[1]!.headers.get("authorization")).toBe("Bearer tok-123456");
      } finally {
        moved.stop(true);
      }
    }
  });

  test("a redirect loop stops after five hops", async () => {
    requests = [];
    reply = { status: 307, body: "", contentType: "text/plain", headers: { location: "/mcp" } };

    const err = await cliError(callToolBlocks(opts(), "t", {}));

    expect(requests).toHaveLength(6);
    expect(err.code).toBe(EXIT.ERROR);
    expect(err.message).toBe(`${origin}/mcp redirected more than 5 times; check the proxy in front of PipesHub.`);
  });
});

describe("network failures say why", () => {
  // The published binary runs on Node, whose fetch reports every network
  // failure as a TypeError "fetch failed" and keeps the reason (refused, no
  // such host, a certificate it does not trust) on `cause`. Bun, which runs
  // these tests, puts the reason in the message instead, so Node's shape is
  // reproduced here exactly as Node 24 throws it.
  const nodeFailure = (code: string, message: string) =>
    new TypeError("fetch failed", { cause: Object.assign(new Error(message), { code }) });

  test("an unreachable instance names the cause, from both tools/call and tools/list", async () => {
    const cases: Array<[string, string]> = [
      ["ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:9"],
      ["ENOTFOUND", "getaddrinfo ENOTFOUND pipeshub.invalid"],
      ["SELF_SIGNED_CERT_IN_CHAIN", "self-signed certificate in certificate chain"],
    ];
    for (const [code, message] of cases) {
      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        (() => Promise.reject(nodeFailure(code, message))) as unknown as typeof fetch,
      );
      try {
        const expected = `could not reach ${origin}/mcp: fetch failed (${message})`;
        expect(firstLine((await cliError(callToolBlocks(opts(), "t", {}))).message)).toBe(expected);
        expect(firstLine((await cliError(listTools(opts()))).message)).toBe(expected);
      } finally {
        fetchSpy.mockRestore();
      }
    }
  });

  test("a dual-stack failure, whose own message is empty, names each address or its code", async () => {
    // `localhost`, or any host with an IPv4 and an IPv6 address, makes Node try
    // both. When both fail, `cause` is an AggregateError with message "" and
    // the per-address reasons on `errors`; this is the shape Node 22 and 24
    // produce, measured with a two-address lookup.
    const refused = (address: string) =>
      Object.assign(new Error(`connect ECONNREFUSED ${address}:9`), { code: "ECONNREFUSED" });
    const aggregate = (errors: Error[], code: string) =>
      new TypeError("fetch failed", { cause: Object.assign(new AggregateError(errors, ""), { code }) });
    const cases: Array<[TypeError, string]> = [
      [
        aggregate([refused("::1"), refused("127.0.0.1"), refused("127.0.0.1")], "ECONNREFUSED"),
        "fetch failed (connect ECONNREFUSED ::1:9; connect ECONNREFUSED 127.0.0.1:9)",
      ],
      [aggregate([], "ETIMEDOUT"), "fetch failed (ETIMEDOUT)"],
      [
        aggregate(["::1", "10.0.0.1", "10.0.0.2", "10.0.0.3"].map(refused), "ECONNREFUSED"),
        "fetch failed (connect ECONNREFUSED ::1:9; connect ECONNREFUSED 10.0.0.1:9; "
          + "connect ECONNREFUSED 10.0.0.2:9; and 1 more)",
      ],
    ];
    for (const [failure, detail] of cases) {
      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        (() => Promise.reject(failure)) as unknown as typeof fetch,
      );
      try {
        expect(firstLine((await cliError(callToolBlocks(opts(), "t", {}))).message))
          .toBe(`could not reach ${origin}/mcp: ${detail}`);
      } finally {
        fetchSpy.mockRestore();
      }
    }
  });

  test("a message that already carries its reason is left as it is", async () => {
    const closed = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") });
    const deadOrigin = `http://127.0.0.1:${closed.port}`;
    closed.stop(true);

    const err = await cliError(callToolBlocks(opts({ origin: deadOrigin }), "t", {}));

    expect(err.message).toStartWith(`could not reach ${deadOrigin}/mcp: `);
    expect(err.message).not.toContain("(undefined)");
    expect(err.message).not.toEndWith("()");
  });

  test("auth status on a slow instance says the request timed out", async () => {
    reply = { body: sse({ jsonrpc: "2.0", id: 1, result: { tools: [] } }), delayMs: 500 };

    const err = await cliError(listTools(opts({ timeoutMs: 50 })));

    expect(firstLine(err.message)).toBe(`could not reach ${origin}/mcp: request timed out`);
  });

  test("tools/list shows the server's reason for a refusal, as tools/call does", async () => {
    reply = { status: 401, body: "token revoked", contentType: "text/plain" };

    const err = await cliError(listTools(opts()));

    expect(err.code).toBe(EXIT.UNAUTHENTICATED);
    expect(firstLine(err.message)).toBe("MCP request failed (HTTP 401 Unauthorized): token revoked");
  });
});

describe("the token never comes back out", () => {
  // Whatever the server sends is printed: errors on stderr, results on
  // stdout. A proxy or error page that echoes the request's headers would
  // otherwise put the bearer into an agent's transcript.
  const token = "tok-123456";

  test("an HTTP error page that echoes the Authorization header", async () => {
    reply = { status: 400, body: `Bad request. Headers: authorization: Bearer ${token}`, contentType: "text/plain" };

    const err = await cliError(callToolBlocks(opts(), "t", {}));

    expect(firstLine(err.message)).toBe("MCP request failed (HTTP 400 Bad Request): Bad request. Headers: authorization: Bearer [redacted]");
  });

  test("a JSON-RPC error, a tool error and an unparseable body that quote it", async () => {
    reply = { body: sse({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: `bad token ${token}` } }) };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message).toBe("MCP error: bad token [redacted]");

    reply = { body: sse(result([{ type: "text", text: `Search failed (HTTP 401). Token ${token} revoked.` }], true)) };
    const toolErr = await cliError(callToolBlocks(opts(), "t", {}));
    expect(toolErr.message).toBe("Search failed (HTTP 401). Token [redacted] revoked.");
    expect(toolErr.code).toBe(EXIT.UNAUTHENTICATED);

    reply = { body: `<html>you sent ${token}</html>`, contentType: "text/html" };
    expect((await cliError(callToolBlocks(opts(), "t", {}))).message)
      .toBe("could not parse the MCP response as JSON: <html>you sent [redacted]</html>");
  });

  test("a result that contains it, and auth status's error field", async () => {
    reply = { body: sse(result([{ type: "text", text: `debug: bearer=${token}` }])) };
    expect(await callTool(opts(), "t", {})).toBe("debug: bearer=[redacted]");

    reply = { status: 401, body: `rejected ${token}`, contentType: "text/plain" };
    const status = await authStatus({ ...opts(), json: true, maxChars: 1000 });
    expect(JSON.stringify(status.payload)).not.toContain(token);
    expect(firstLine(String(status.payload["error"]))).toBe("MCP request failed (HTTP 401 Unauthorized): rejected [redacted]");
  });

  test("a placeholder too short to be a token is not scrubbed out of the output", async () => {
    reply = { body: sse(result([{ type: "text", text: "1 of 1" }])) };
    expect(await callTool(opts({ token: "1" }), "t", {})).toBe("1 of 1");
  });
});

describe("every transport failure ends with what to do next", () => {
  const cases: Array<[Reply, string]> = [
    [
      { status: 401, body: "", contentType: "text/plain" },
      "PipesHub rejected the token: it may be expired, revoked, or made for a different "
        + "instance. Run 'pipeshub auth status' to see its expiry, and "
        + "'pipeshub auth connect-help' to set up a new one.",
    ],
    [
      { status: 403, body: "", contentType: "text/plain" },
      "The person this token belongs to cannot access this. Another command will not "
        + "get around it.",
    ],
    [
      { status: 429, body: "", contentType: "text/plain", headers: { "retry-after": "30" } },
      "PipesHub is rate limiting this token and asked to wait 30 seconds. Wait, then "
        + "retry once.",
    ],
    [
      { status: 429, body: "", contentType: "text/plain" },
      "PipesHub is rate limiting this token. Wait a little, then retry once.",
    ],
    [
      { status: 404, body: "", contentType: "text/plain" },
      "Nothing answers at /mcp there. Check that PIPESHUB_BASE_URL is your PipesHub "
        + "instance's address.",
    ],
    [
      { status: 503, body: "", contentType: "text/plain" },
      "PipesHub could not answer just now. Try again shortly; if it keeps failing, quote "
        + "request id req-1 to whoever runs the instance.",
    ],
    [
      { status: 400, body: "", contentType: "text/plain" },
      "If this keeps happening, quote request id req-1 to whoever runs the instance.",
    ],
  ];

  test("each HTTP refusal says what to do, on its own line", async () => {
    for (const [r, step] of cases) {
      reply = r;
      const err = await cliError(callToolBlocks(opts(), "t", {}));
      expect(err.message.split("\n")).toEqual([firstLine(err.message), step]);
    }
  });

  test("an unreachable instance and a timeout say what to check", async () => {
    const closed = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") });
    const deadOrigin = `http://127.0.0.1:${closed.port}`;
    closed.stop(true);
    const unreachable = await cliError(listTools(opts({ origin: deadOrigin })));
    expect(unreachable.message.split("\n")[1]).toBe(
      "Check that PIPESHUB_BASE_URL is your PipesHub instance's address and that it is "
        + "reachable from here. From a sandbox, localhost and LAN addresses are not.",
    );

    reply = { body: sse(result([])), delayMs: 500 };
    const slow = await cliError(callToolBlocks(opts({ timeoutMs: 50 }), "t", {}));
    expect(slow.message.split("\n")[1]).toBe(
      "PipesHub did not answer in time. Try again; if it keeps timing out, the instance "
        + "may be overloaded.",
    );
  });
});
