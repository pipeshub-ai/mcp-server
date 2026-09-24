import { afterAll, beforeAll, describe, expect, test } from "bun:test";
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

type Reply = { status?: number; body: string; contentType?: string; delayMs?: number };

let reply: Reply = { body: "" };
let seen: { headers: Headers; body: unknown } | null = null;
let server: ReturnType<typeof Bun.serve>;
let origin: string;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      seen = { headers: req.headers, body: await req.json() };
      if (reply.delayMs) await Bun.sleep(reply.delayMs);
      return new Response(reply.body, {
        status: reply.status ?? 200,
        headers: { "content-type": reply.contentType ?? "text/event-stream" },
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
    expect(slow.message).toBe(`could not reach ${origin}/mcp: request timed out`);
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
});

describe("decodeToolJson", () => {
  test("parses JSON text and leaves anything else as it was", () => {
    expect(decodeToolJson('{"a":1}')).toEqual({ a: 1 });
    expect(decodeToolJson("plain words")).toBe("plain words");
    expect(decodeToolJson(undefined)).toBeUndefined();
  });
});
