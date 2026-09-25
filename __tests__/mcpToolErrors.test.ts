import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, type Socket } from "node:net";
import type { AddressInfo } from "node:net";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";

// What the model is told when a tool cannot get an answer from PipesHub. This
// is the `start` path: no getSDK, so the server builds its own SDK from the
// URL and bearer it was started with. PipesHub is a server on loopback.

const logger = createConsoleLogger("error");
const savedTimeout = process.env["PIPESHUB_MCP_TIMEOUT_MS"];

afterEach(() => {
  if (savedTimeout === undefined) delete process.env["PIPESHUB_MCP_TIMEOUT_MS"];
  else process.env["PIPESHUB_MCP_TIMEOUT_MS"] = savedTimeout;
});

async function agentsTool(origin: string, bearer = "operator-pat-0000"): Promise<{ isError: boolean; text: string }> {
  const { server } = createMCPServer({
    logger,
    serverURL: `${origin}/api/v1`,
    security: { bearerAuth: bearer },
  });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(c);
  try {
    const res = await client.callTool({ name: "pipeshub_agents", arguments: {} });
    const content = res.content as Array<{ type: string; text?: string }>;
    return { isError: res.isError === true, text: content.map((b) => b.text ?? "").join("\n") };
  } finally {
    await client.close();
  }
}

const NEXT_STEP = "Check that the PipesHub address this server was started with "
  + "(--server-url or --instance-url) is right and reachable from this machine.";

describe("network failures reach the model with their cause and a next step", () => {
  // The published server runs on Node, whose fetch rejects with a TypeError
  // "fetch failed" and keeps the reason on `cause`: an Error for one address,
  // an AggregateError with an empty message when several were tried. Bun,
  // which runs these tests, throws differently, so Node's shapes are
  // reproduced here as Node 22 and 24 throw them.
  const refused = (address: string) =>
    Object.assign(new Error(`connect ECONNREFUSED ${address}:9`), { code: "ECONNREFUSED" });

  test("a refused connection, one address or several", async () => {
    const cases: Array<[unknown, string]> = [
      [refused("127.0.0.1"), "fetch failed (connect ECONNREFUSED 127.0.0.1:9)"],
      [
        Object.assign(new AggregateError([refused("::1"), refused("127.0.0.1")], ""), { code: "ECONNREFUSED" }),
        "fetch failed (connect ECONNREFUSED ::1:9; connect ECONNREFUSED 127.0.0.1:9)",
      ],
    ];
    for (const [cause, detail] of cases) {
      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
        (() => Promise.reject(new TypeError("fetch failed", { cause }))) as unknown as typeof fetch,
      );
      try {
        const res = await agentsTool("http://pipeshub.test");

        expect(res.isError).toBe(true);
        expect(res.text).toBe(`Unable to make request to http://pipeshub.test: ${detail}. ${NEXT_STEP}`);
      } finally {
        fetchSpy.mockRestore();
      }
    }
  });

  test("a connection the server drops says so too", async () => {
    const dropper = createServer((socket: Socket) => {
      socket.once("data", () => socket.resetAndDestroy());
    });
    await new Promise<void>((resolve) => dropper.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(dropper.address() as AddressInfo).port}`;
    try {
      const res = await agentsTool(origin);

      expect(res.isError).toBe(true);
      expect(res.text).toStartWith(`Unable to make request to ${origin}: `);
      expect(res.text).toEndWith(NEXT_STEP);
      expect(res.text).not.toContain("TypeError");
    } finally {
      dropper.close();
    }
  });

  test("a backend that never answers is a timeout with what to do about it", async () => {
    const api = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch() {
        await Bun.sleep(3_000);
        return Response.json({ agents: [] });
      },
    });
    process.env["PIPESHUB_MCP_TIMEOUT_MS"] = "100";
    try {
      const res = await agentsTool(`http://127.0.0.1:${api.port}`);

      expect(res.isError).toBe(true);
      expect(res.text).toBe(
        "Request timed out: PipesHub did not start answering within 0.1 s. Try again; "
          + "if it keeps happening, check that PipesHub is healthy, or raise PIPESHUB_MCP_TIMEOUT_MS.",
      );
    } finally {
      api.stop(true);
    }
  });
});

describe("backend error text reaches the model without the bearer", () => {
  const BEARER = "operator-pat-0000";

  async function echoing(status: number, body: (auth: string) => string) {
    return Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: (req) => new Response(body(req.headers.get("authorization") ?? ""), {
        status,
        headers: { "content-type": "text/plain" },
      }),
    });
  }

  test("an error page that quotes the Authorization header", async () => {
    for (const status of [400, 401, 403, 500]) {
      const api = await echoing(status, (auth) => `rejected request with authorization: ${auth}`);
      try {
        const res = await agentsTool(`http://127.0.0.1:${api.port}`, BEARER);

        expect(res.isError).toBe(true);
        expect(res.text).not.toContain(BEARER);
        expect(res.text).toContain("rejected request with authorization: Bearer [redacted]");
      } finally {
        api.stop(true);
      }
    }
  });

  test("a JSON error envelope that quotes it, after the retries give up", async () => {
    const api = await echoing(503, (auth) => JSON.stringify({ message: `upstream saw ${auth.slice(7)}` }));
    try {
      const res = await agentsTool(`http://127.0.0.1:${api.port}`, BEARER);

      expect(res.text).toContain("upstream saw [redacted]");
      expect(res.text).not.toContain(BEARER);
    } finally {
      api.stop(true);
    }
  });

  test("a value too short to be a real token is left alone", async () => {
    const api = await echoing(400, () => "field 1 of 1 is wrong");
    try {
      const res = await agentsTool(`http://127.0.0.1:${api.port}`, "1");
      expect(res.text).toContain("field 1 of 1 is wrong");
    } finally {
      api.stop(true);
    }
  });
});

describe("a rate limit tells the model how long to wait", () => {
  async function limited(headers: Record<string, string>, status = 429) {
    const api = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => new Response(JSON.stringify({ message: "Too many requests" }), {
        status,
        headers: { "content-type": "application/json", ...headers },
      }),
    });
    try {
      return await agentsTool(`http://127.0.0.1:${api.port}`);
    } finally {
      api.stop(true);
    }
  }

  test("a Retry-After too long to wait out is handed back with the wait in it", async () => {
    const res = await limited({ "retry-after": "60" });

    expect(res.isError).toBe(true);
    expect(res.text).toBe(
      "Agent list request failed (HTTP 429 Too Many Requests). Too many requests. "
        + "Rate limited: PipesHub asked to wait 60 s before retrying.",
    );
  });

  test("an HTTP-date Retry-After is turned into seconds, on a 503 too", async () => {
    const at = new Date(Date.now() + 90_000).toUTCString();
    const res = await limited({ "retry-after": at }, 503);

    expect(res.text).toMatch(/Service Unavailable\)\. Too many requests\. PipesHub asked to wait (8[89]|9[01]) s before retrying\.$/);
  });

  test("a 429 with no Retry-After still says to wait", async () => {
    // Three tries with backoff happen first; the last 429 is what is shown.
    const res = await limited({});

    expect(res.text).toEndWith("Rate limited: wait before retrying.");
  });
});
