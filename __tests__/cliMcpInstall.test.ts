import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FIRST_START_WITH_SIGN_IN } from "../src/cli/mcp-install.js";

// `pipeshub mcp install` edits another program's config, so what can go wrong
// is local: a token written into that config, other servers in it dropped, an
// existing entry overwritten without asking, a dry run that changes files, or
// an entry that does not actually authenticate when the client runs it.

const ROOT = join(import.meta.dir, "..");
const ENTRY = join(ROOT, "src", "cli", "pipeshub.ts");
const USER_ID = "507f1f77bcf86cd799439011";
const ACCESS = ["h", Buffer.from(JSON.stringify({ userId: USER_ID, exp: 4102444800 })).toString("base64url"), "s"].join(".");

let api: ReturnType<typeof Bun.serve>;
let origin = "";
const seen: Array<{ path: string; authorization: string | null }> = [];
let home = "";

beforeAll(() => {
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      seen.push({ path: new URL(req.url).pathname, authorization: req.headers.get("authorization") });
      return Response.json({ _id: USER_ID });
    },
  });
  origin = `http://127.0.0.1:${api.port}`;
});

afterAll(() => api.stop(true));

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pipeshub-mcp-install-"));
  await mkdir(join(home, ".config", "pipeshub"), { recursive: true });
  // A current sign-in, so nothing needs a refresh.
  await writeFile(join(home, ".config", "pipeshub", "credentials.json"), JSON.stringify({
    origin,
    clientId: "pipeshub-agent",
    tokenEndpoint: `${origin}/api/v1/oauth2/token`,
    accessToken: ACCESS,
    refreshToken: "refresh-1",
    expiresAt: Date.now() + 3_600_000,
  }), { mode: 0o600 });
  seen.length = 0;
});

async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, ENTRY, "mcp", "install", ...args], {
    env: { PATH: process.env["PATH"] ?? "", HOME: home, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  for (const out of [stdout, stderr]) expect(out).not.toContain(ACCESS);
  return { code, stdout, stderr };
}

const entryArgs = () => ["-y", `@pipeshub-ai/mcp@>=${FIRST_START_WITH_SIGN_IN}`, "start", "--server-url", origin];

/** A stub client CLI on PATH that appends each invocation's argv to a file. */
async function stubCli(name: string): Promise<{ path: string; calls: () => Promise<string[][]> }> {
  const bin = join(home, "bin");
  await mkdir(bin, { recursive: true });
  const record = join(home, `${name}-calls.txt`);
  await writeFile(join(bin, name), `#!/bin/sh\n{ printf '%s\\n' "$@"; echo ---; } >> ${JSON.stringify(record)}\n`);
  await chmod(join(bin, name), 0o755);
  return {
    path: `${bin}:${process.env["PATH"] ?? ""}`,
    calls: async () =>
      (await readFile(record, "utf8")).split("---\n").filter(Boolean).map((c) => c.trim().split("\n")),
  };
}

describe("pipeshub mcp install", () => {
  test("cursor: merges the entry, keeps other servers, and writes no token", async () => {
    const path = join(home, ".cursor", "mcp.json");
    await mkdir(join(home, ".cursor"));
    await writeFile(path, JSON.stringify({ mcpServers: { other: { command: "x" } }, theme: "dark" }));

    const r = await cli(["--client", "cursor"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
      mcpServers: { other: { command: "x" }, pipeshub: { command: "npx", args: entryArgs() } },
      theme: "dark",
    });
    expect(await readFile(path, "utf8")).not.toContain(ACCESS);
  });

  test("the written entry authenticates as the signed-in user when the client launches it", async () => {
    await cli(["--client", "cursor"]);
    const { args } = JSON.parse(await readFile(join(home, ".cursor", "mcp.json"), "utf8")).mcpServers.pipeshub as {
      args: string[];
    };
    // Runs this checkout's `start`, which is what FIRST_START_WITH_SIGN_IN ships; npm cannot be reached here.
    const c = new Client({ name: "test", version: "1" });
    await c.connect(new StdioClientTransport({
      command: process.execPath,
      args: [join(ROOT, "src", "mcp-server", "mcp-server.ts"), ...args.slice(args.indexOf("start"))],
      env: { HOME: home, PATH: process.env["PATH"] ?? "" },
      stderr: "pipe",
    }));
    try {
      await c.callTool({ name: "pipeshub_directory", arguments: { action: "whoami" } });
      expect(seen.at(-1)).toEqual({ path: `/api/v1/users/${USER_ID}`, authorization: `Bearer ${ACCESS}` });
    } finally {
      await c.close();
    }
  }, 20_000);

  test("an existing pipeshub entry is kept unless --force", async () => {
    await cli(["--client", "cursor"]);
    const again = await cli(["--client", "cursor"]);
    expect(again.code).toBe(2);
    expect(again.stderr).toContain("--force");
    expect((await cli(["--client", "cursor", "--force"])).code).toBe(0);
  });

  test("claude-code: runs claude's own mcp add, user scope", async () => {
    const claude = await stubCli("claude");
    expect((await cli(["--client", "claude-code"], { PATH: claude.path })).code).toBe(0);
    expect(await claude.calls()).toEqual([["mcp", "add", "--scope", "user", "pipeshub", "--", "npx", ...entryArgs()]]);
  });

  test("codex: runs codex's own mcp add, and --force removes the old entry first", async () => {
    const codex = await stubCli("codex");
    expect((await cli(["--client", "codex", "--force"], { PATH: codex.path })).code).toBe(0);
    expect(await codex.calls()).toEqual([
      ["mcp", "remove", "pipeshub"],
      ["mcp", "add", "pipeshub", "--", "npx", ...entryArgs()],
    ]);
  });

  test("a client CLI that is not installed is a clear error", async () => {
    const r = await cli(["--client", "gemini"], { PATH: "/nonexistent" });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("could not run gemini");
  });

  test("--dry-run reports the change and writes nothing", async () => {
    const r = await cli(["--client", "cursor", "--dry-run"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ dryRun: true, wrote: join(home, ".cursor", "mcp.json") });
    await expect(stat(join(home, ".cursor", "mcp.json"))).rejects.toThrow();
  });

  test("with only an environment token, it says the entry needs pipeshub login", async () => {
    const r = await cli(["--client", "cursor", "--dry-run"], { PIPESHUB_TOKEN: "env-token", PIPESHUB_BASE_URL: origin });
    expect(JSON.parse(r.stdout).note).toContain("pipeshub login");
  });

  test("the minimum excludes 4.6.0, the last published start without the sign-in fallback", () => {
    const cmp = (x: string, y: string) => {
      const [a, b] = [x.split(".").map(Number), y.split(".").map(Number)];
      for (let k = 0; k < 3; k++) if (a[k] !== b[k]) return a[k]! - b[k]!;
      return 0;
    };
    expect(cmp("4.6.0", FIRST_START_WITH_SIGN_IN)).toBeLessThan(0);
  });

  test("an unknown client is a usage error", async () => {
    expect((await cli(["--client", "vim"])).code).toBe(2);
  });
});
