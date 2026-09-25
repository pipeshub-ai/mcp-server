import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PipeshubCore } from "../src/core.js";
import { usersGetUserById } from "../src/funcs/usersGetUserById.js";
import { HTTPClient } from "../src/lib/http.js";
import { buildSDK } from "../src/mcp-server/tools.js";

// `--log-level debug` is what someone turns on when a tool call misbehaves.
// For the stdio server, stdout *is* the MCP connection, so anything else
// written there corrupts it; and the log must never contain the credential
// (AGENTS.md: never print or log a PAT).

const USER_ID = "507f1f77bcf86cd799439011";
const TOKEN = "h." + Buffer.from(JSON.stringify({ userId: USER_ID, exp: 4102444800 })).toString("base64url") + ".s";

let api: ReturnType<typeof Bun.serve>;
let home: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "mcpcov-init-debug-"));
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => Response.json({ _id: USER_ID }, { headers: { "set-cookie": "session=secret-cookie" } }),
  });
});

afterAll(async () => {
  api.stop(true);
  await rm(home, { recursive: true, force: true });
});

describe("SDK debug logging", () => {
  test("logs the request and response but never the credential", async () => {
    const lines: string[] = [];
    let depth = 0;
    const sdk = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: TOKEN },
      httpClient: new HTTPClient({
        fetcher: async () =>
          Response.json({ _id: USER_ID }, { headers: { "set-cookie": "session=secret-cookie" } }),
      }),
      debugLogger: {
        log: (...args: unknown[]) => void lines.push("  ".repeat(depth) + args.map(String).join(" ")),
        group: (label?: string) => {
          lines.push("  ".repeat(depth) + (label ?? ""));
          depth++;
        },
        groupEnd: () => void depth--,
      },
    });

    await usersGetUserById(sdk, { id: USER_ID });

    const log = lines.join("\n");
    expect(log).toContain(`> Request: GET http://pipeshub.test/api/v1/users/${USER_ID}`);
    expect(log).toContain("< Response: GET");
    expect(log).toContain("authorization: [redacted]");
    expect(log).toContain("set-cookie: [redacted]");
    expect(log).toContain("accept: application/json");
    expect(log).not.toContain(TOKEN);
    expect(log).not.toContain("secret-cookie");
  });
});

describe("start --log-level debug over stdio", () => {
  test("keeps stdout to JSON-RPC and the token out of both streams", async () => {
    const proc = Bun.spawn([
      process.execPath,
      join(import.meta.dir, "..", "src", "mcp-server", "mcp-server.ts"),
      "start", "--log-level", "debug",
      "--server-url", `http://127.0.0.1:${api.port}/api/v1`,
      "--bearer-auth", TOKEN,
    ], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { PATH: process.env["PATH"] ?? "", HOME: home },
    });
    const send = (m: unknown) => {
      proc.stdin.write(JSON.stringify(m) + "\n");
      proc.stdin.flush();
    };
    const stdout = new Response(proc.stdout).text();
    const stderr = new Response(proc.stderr).text();

    send({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "pipeshub_directory", arguments: { action: "whoami" } } });
    // Closing stdin ends the stdio server once it has answered.
    await Bun.sleep(1000);
    proc.stdin.end();
    const timer = setTimeout(() => proc.kill(), 10_000);
    await proc.exited;
    clearTimeout(timer);

    const out = await stdout;
    const err = await stderr;
    const messages = out.split("\n").filter((l) => l !== "").map((l) => JSON.parse(l) as { id?: number });

    expect(messages.map((m) => m.id)).toEqual([1, 2]);
    // Debug output still happens, just not on the MCP channel.
    expect(err).toContain(`> Request: GET http://127.0.0.1:${api.port}/api/v1/users/${USER_ID}`);
    expect(err).toContain("authorization: [redacted]");
    expect(out).not.toContain(TOKEN);
    expect(err).not.toContain(TOKEN);
  }, 20_000);
});

describe("serve --log-level debug", () => {
  test("the per-request SDK logs to stderr, not stdout", async () => {
    const sdk = buildSDK(
      new Headers(),
      { "server-url": `http://127.0.0.1:${api.port}/api/v1`, "bearer-auth": TOKEN },
      false,
      { level: "debug" },
    );
    const out: string[] = [];
    const err: string[] = [];
    const outSpy = spyOn(process.stdout, "write").mockImplementation(((c: string | Uint8Array) => {
      out.push(String(c));
      return true;
    }) as typeof process.stdout.write);
    const errSpy = spyOn(process.stderr, "write").mockImplementation(((c: string | Uint8Array) => {
      err.push(String(c));
      return true;
    }) as typeof process.stderr.write);
    try {
      await usersGetUserById(sdk, { id: USER_ID });
    } finally {
      outSpy.mockRestore();
      errSpy.mockRestore();
    }
    expect(err.join("")).toContain(`> Request: GET http://127.0.0.1:${api.port}/api/v1/users/${USER_ID}`);
    expect(out.join("")).not.toContain("> Request");
    expect(err.join("")).not.toContain(TOKEN);
  });
});
