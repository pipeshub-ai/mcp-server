import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApplication, run, type Command, type CommandContext } from "@stricli/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { serveCommand } from "../src/mcp-server/cli/serve/command.js";
import { startCommand } from "../src/mcp-server/cli/start/command.js";

// `npx @pipeshub-ai/mcp start` is what README, server.json and the Claude
// Desktop manifest all tell people to run, and `serve` is the HTTP variant.
// These tests drive both commands the way a user does -- arguments in, an MCP
// client on the other end -- against a fake PipesHub API on loopback, and check
// what reached that API: which path, and whose credential.

const USER_ID = "507f1f77bcf86cd799439011";
const jwt = (claims: Record<string, unknown>): string =>
  ["h", Buffer.from(JSON.stringify(claims)).toString("base64url"), "s"].join(".");
const BEARER = jwt({ userId: USER_ID, exp: 4102444800 });
const OTHER_BEARER = jwt({ userId: USER_ID, exp: 4102444800, who: "header" });

const CURATED = [
  "pipeshub_sources",
  "pipeshub_chat",
  "pipeshub_search",
  "pipeshub_download_record",
  "pipeshub_get_record_content",
  "pipeshub_directory",
  "pipeshub_agents",
];

interface ApiCall {
  path: string;
  authorization: string | null;
}

let api: ReturnType<typeof Bun.serve>;
let apiOrigin: string;
const apiCalls: ApiCall[] = [];
let home: string;

beforeAll(async () => {
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      apiCalls.push({
        path: new URL(req.url).pathname,
        authorization: req.headers.get("authorization"),
      });
      return Response.json({ _id: USER_ID });
    },
  });
  apiOrigin = `http://127.0.0.1:${api.port}`;
  home = await mkdtemp(join(tmpdir(), "mcpcov-init-mcp-"));
});

afterAll(async () => {
  api.stop(true);
  await rm(home, { recursive: true, force: true });
});

const whoami = (c: Client) =>
  c.callTool({ name: "pipeshub_directory", arguments: { action: "whoami" } });

const textOf = (r: Awaited<ReturnType<typeof whoami>>): string =>
  (r.content as Array<{ text?: string }>).map((b) => b.text ?? "").join("");

// ─── in-process: serve and start --transport sse ───────────────────────────

interface Launched {
  port: number;
  /** Deliver SIGTERM to the handlers this launch registered; resolves to the exit code. */
  terminate(): Promise<number>;
}

const launched: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (launched.length > 0) await launched.pop()?.();
});

interface TestContext extends CommandContext {
  readonly process: CommandContext["process"] & { exitCode?: number | string | null };
}

function context(): { ctx: TestContext; out: string[] } {
  const out: string[] = [];
  const proc: TestContext["process"] = {
    stdout: { write: (s: string) => void out.push(s) },
    stderr: { write: (s: string) => void out.push(s) },
  };
  return { ctx: { process: proc }, out };
}

// The commands take a LocalContext; the parts they read are the ones above.
const app = (cmd: typeof serveCommand | typeof startCommand) =>
  buildApplication(cmd as Command<CommandContext>, { name: "mcp" });

/**
 * Run a server command in this process. It listens on port 0, so the real
 * port is read from the "server started" log line.
 */
async function launch(cmd: typeof serveCommand | typeof startCommand, argv: string[]): Promise<Launched> {
  const logs: string[] = [];
  const errSpy = spyOn(console, "error").mockImplementation((...a: unknown[]) => {
    logs.push(a.map(String).join(" "));
  });
  const before = new Set(process.listeners("SIGTERM"));
  const beforeInt = new Set(process.listeners("SIGINT"));
  const { ctx, out } = context();

  await run(app(cmd), [...argv, "--port", "0"], ctx);

  let port = 0;
  for (let i = 0; i < 200 && port === 0; i++) {
    const m = logs.join("\n").match(/server started.* host=[^\s]*:(\d+)/);
    if (m?.[1]) port = Number(m[1]);
    else await Bun.sleep(5);
  }
  if (port === 0) throw new Error(`server did not start: ${out.join("")}`);

  const term = process.listeners("SIGTERM").filter((l) => !before.has(l));
  const int = process.listeners("SIGINT").filter((l) => !beforeInt.has(l));
  let exitCode: number | null = null;

  const terminate = async (): Promise<number> => {
    if (exitCode !== null) return exitCode;
    const codes: number[] = [];
    const exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
      codes.push(code ?? 0);
    }) as typeof process.exit);
    try {
      for (const l of term) (l as () => void)();
      // Past the servers' 5-second forced-exit timer, so that exit is caught
      // by this mock too rather than ending the test run later.
      for (let i = 0; i < 1300 && codes.length === 0; i++) await Bun.sleep(5);
      exitCode = codes[0] ?? -1;
      return exitCode;
    } finally {
      exitSpy.mockRestore();
    }
  };

  launched.push(async () => {
    await terminate();
    for (const l of term) process.off("SIGTERM", l);
    for (const l of int) process.off("SIGINT", l);
    errSpy.mockRestore();
  });

  return { port, terminate };
}

async function httpClient(port: number, headers: Record<string, string> = {}): Promise<Client> {
  const c = new Client({ name: "test", version: "1" });
  // The same cast serve/impl.ts makes: the SDK's transport classes do not
  // satisfy its own Transport type under exactOptionalPropertyTypes.
  await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers },
  }) as Transport);
  return c;
}

describe("serve", () => {
  test("serves the curated tools over Streamable HTTP with the operator's bearer", async () => {
    const s = await launch(serveCommand, ["--server-url", `${apiOrigin}/api/v1`, "--bearer-auth", BEARER]);
    const c = await httpClient(s.port);

    expect((await c.listTools()).tools.map((t) => t.name)).toEqual(CURATED);
    apiCalls.length = 0;
    const r = await whoami(c);

    expect(r.isError).toBeFalsy();
    expect(JSON.parse(textOf(r))).toMatchObject({ userId: USER_ID, identityVerified: true });
    expect(apiCalls).toEqual([{ path: `/api/v1/users/${USER_ID}`, authorization: `Bearer ${BEARER}` }]);

    await c.close();
    expect(await s.terminate()).toBe(0);
  });

  test("a caller's bearerAuth header wins over the operator's flag", async () => {
    const s = await launch(serveCommand, ["--server-url", `${apiOrigin}/api/v1`, "--bearer-auth", BEARER]);
    const c = await httpClient(s.port, { bearerAuth: OTHER_BEARER });
    apiCalls.length = 0;

    await whoami(c);

    expect(apiCalls[0]?.authorization).toBe(`Bearer ${OTHER_BEARER}`);
    await c.close();
  });

  test("--disable-static-auth never lends the operator's bearer to a caller without one", async () => {
    const s = await launch(serveCommand, [
      "--server-url", `${apiOrigin}/api/v1`, "--bearer-auth", BEARER, "--disable-static-auth",
    ]);
    const c = await httpClient(s.port);
    apiCalls.length = 0;

    const r = await whoami(c);

    // whoami refuses offline when there is no token, so nothing is sent at all.
    expect(r.isError).toBe(true);
    expect(apiCalls).toEqual([]);
    await c.close();
  });

  test("answers CORS preflight without reaching the MCP handler", async () => {
    const s = await launch(serveCommand, ["--server-url", `${apiOrigin}/api/v1`]);
    const res = await fetch(`http://127.0.0.1:${s.port}/mcp`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
  });

  test("--env values are set before the server starts", async () => {
    const key = "MCPCOV_INIT_SERVE_ENV";
    try {
      await launch(serveCommand, ["--env", `${key}=a=b`]);
      // Only the first "=" separates the name from the value.
      expect(process.env[key]).toBe("a=b");
    } finally {
      delete process.env[key];
    }
  });
});

describe("start --transport sse", () => {
  test("serves the curated tools over SSE and uses a caller's bearerauth header", async () => {
    const s = await launch(startCommand, [
      "--transport", "sse", "--server-url", `${apiOrigin}/api/v1`, "--bearer-auth", BEARER,
    ]);
    const c = new Client({ name: "test", version: "1" });
    await c.connect(new SSEClientTransport(new URL(`http://127.0.0.1:${s.port}/sse`), {
      requestInit: { headers: { bearerauth: OTHER_BEARER } },
    }));

    expect((await c.listTools()).tools.map((t) => t.name)).toEqual(CURATED);
    apiCalls.length = 0;
    await whoami(c);
    expect(apiCalls).toEqual([{ path: `/api/v1/users/${USER_ID}`, authorization: `Bearer ${OTHER_BEARER}` }]);

    await c.close();
    expect(await s.terminate()).toBe(0);
  });

  test("a message for a session that does not exist is a 404", async () => {
    const s = await launch(startCommand, ["--transport", "sse"]);
    const res = await fetch(`http://127.0.0.1:${s.port}/message/not-a-session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Session not found");
  });
});

describe("flag validation", () => {
  // Stricli prints `Failed to parse "<value>" for <flag>: <our message>`. The
  // message used to be a raw Zod issue array, JSON and all.
  async function refused(cmd: typeof serveCommand | typeof startCommand, argv: string[]): Promise<string> {
    const { ctx, out } = context();
    await run(app(cmd), argv, ctx);
    expect(ctx.process.exitCode).not.toBe(0);
    const text = out.join("");
    expect(text).not.toContain('"code"');
    return text;
  }

  test("a port that is not 0-65535 says what is allowed", async () => {
    for (const bad of ["70000", "-1", "abc", "80.5"]) {
      expect(await refused(serveCommand, ["--port", bad]))
        .toContain(`--port must be a whole number from 0 to 65535 (got "${bad}")`);
    }
  });

  test("an --env that is not NAME=value shows the form", async () => {
    for (const bad of ["NOVALUE", "=v", "K="]) {
      expect(await refused(startCommand, ["--env", bad]))
        .toContain(`--env must look like NAME=value, with both parts filled in (got "${bad}")`);
    }
  });

  test("an unknown --transport is refused", async () => {
    expect(await refused(startCommand, ["--transport", "websocket"])).toContain("websocket");
  });
});

// ─── child process: the stdio server exactly as an MCP client launches it ──

async function stdioClient(args: string[]): Promise<Client> {
  const c = new Client({ name: "test", version: "1" });
  await c.connect(new StdioClientTransport({
    command: process.execPath,
    args: [join(import.meta.dir, "..", "src", "mcp-server", "mcp-server.ts"), "start", ...args],
    env: { HOME: home, PATH: process.env["PATH"] ?? "" },
    stderr: "pipe",
  }));
  return c;
}

describe("start (stdio)", () => {
  test("lists the curated tools and calls the API with the flag's bearer", async () => {
    const c = await stdioClient(["--server-url", `${apiOrigin}/api/v1`, "--bearer-auth", BEARER]);
    try {
      expect((await c.listTools()).tools.map((t) => t.name)).toEqual(CURATED);
      apiCalls.length = 0;
      const r = await whoami(c);
      expect(JSON.parse(textOf(r))).toMatchObject({ userId: USER_ID, identityVerified: true });
      expect(apiCalls).toEqual([{ path: `/api/v1/users/${USER_ID}`, authorization: `Bearer ${BEARER}` }]);
    } finally {
      await c.close();
    }
  }, 20_000);

  test("--tool mounts only the named tools", async () => {
    const c = await stdioClient(["--server-url", `${apiOrigin}/api/v1`, "--tool", "pipeshub_search", "--tool", "pipeshub_chat"]);
    try {
      expect((await c.listTools()).tools.map((t) => t.name).sort()).toEqual(["pipeshub_chat", "pipeshub_search"]);
    } finally {
      await c.close();
    }
  }, 20_000);

  test("--mode dynamic exposes the meta-tools instead", async () => {
    const c = await stdioClient(["--server-url", `${apiOrigin}/api/v1`, "--mode", "dynamic"]);
    try {
      const names = (await c.listTools()).tools.map((t) => t.name);
      expect(names).toContain("execute_tool");
      expect(names).not.toContain("pipeshub_search");
    } finally {
      await c.close();
    }
  }, 20_000);
});

describe("--server-url given as the instance origin", () => {
  // README, server.json and the customer skill all say to pass the origin,
  // e.g. https://pipeshub.example.com. Every API path is under /api/v1, and
  // PipesHub answers any other path with the web app's HTML shell, so
  // taking the origin literally broke every tool call in the documented setup.

  test("start (stdio) sends API calls under /api/v1", async () => {
    const c = await stdioClient(["--server-url", apiOrigin, "--bearer-auth", BEARER]);
    try {
      apiCalls.length = 0;
      await whoami(c);
      expect(apiCalls.map((a) => a.path)).toEqual([`/api/v1/users/${USER_ID}`]);
    } finally {
      await c.close();
    }
  }, 20_000);

  test("serve does the same, with or without a trailing slash", async () => {
    for (const url of [apiOrigin, `${apiOrigin}/`]) {
      const s = await launch(serveCommand, ["--server-url", url, "--bearer-auth", BEARER]);
      const c = await httpClient(s.port);
      apiCalls.length = 0;
      await whoami(c);
      expect(apiCalls.map((a) => a.path)).toEqual([`/api/v1/users/${USER_ID}`]);
      await c.close();
      await s.terminate();
    }
  });
});

describe("--instance-url given as a full URL", () => {
  test("start (stdio) reaches the API, as the Claude Desktop manifest configures it", async () => {
    // manifest.json passes --server-index and --instance-url, with a default
    // of "https://app.pipeshub.com": a full URL, not a bare host.
    const c = await stdioClient(["--server-index", "0", "--instance-url", apiOrigin, "--bearer-auth", BEARER]);
    try {
      apiCalls.length = 0;
      await whoami(c);
      expect(apiCalls).toEqual([{ path: `/api/v1/users/${USER_ID}`, authorization: `Bearer ${BEARER}` }]);
    } finally {
      await c.close();
    }
  }, 20_000);
});

describe("the landing page at /", () => {
  // It built the page's origin with `new URL(req.host)`. A host such as
  // "127.0.0.1:2718" or "mcp.example.com" is not a URL on its own, so the
  // page was a 500; "localhost:2718" parsed as a URL whose scheme is
  // "localhost:", and the page showed an address with no http:// in it.
  test("renders with the address the browser used", async () => {
    const s = await launch(serveCommand, ["--server-url", `${apiOrigin}/api/v1`]);
    for (const host of [`127.0.0.1:${s.port}`, `localhost:${s.port}`, "mcp.example.com"]) {
      const res = await fetch(`http://127.0.0.1:${s.port}/`, { headers: { host } });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain(`http://${host}/sse`);
    }
  });

  test("a Host header carrying markup is shown as text, never run", async () => {
    // Node accepts "<" and '"' in Host, and the page echoes the host into
    // <code> blocks, so an unescaped host could close the element and inject
    // a script. fetch() would not send such a header, so this writes the
    // request by hand.
    const s = await launch(serveCommand, ["--server-url", `${apiOrigin}/api/v1`]);
    const host = 'x"</code><script>alert(1)</script>';
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const sock = connect(s.port, "127.0.0.1", () => {
        sock.write(`GET / HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`);
      });
      sock.on("data", (c: Buffer) => chunks.push(c));
      sock.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      sock.on("error", reject);
    });
    // Booleans rather than toContain, which would print the whole page on failure.
    expect(raw.slice(0, 15)).toBe("HTTP/1.1 200 OK");
    expect(raw.includes("<script>alert(1)")).toBe(false);
    expect(raw.includes("x&quot;&lt;/code&gt;&lt;script&gt;alert(1)&lt;/script&gt;/mcp")).toBe(true);
  });

  test("renders for start --transport sse too", async () => {
    const s = await launch(startCommand, ["--transport", "sse"]);
    const res = await fetch(`http://127.0.0.1:${s.port}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`http://127.0.0.1:${s.port}/sse`);
  });
});
