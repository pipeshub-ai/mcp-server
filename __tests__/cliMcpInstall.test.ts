import { beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `pipeshub mcp install` edits another program's config, so what can go wrong
// is local: a token written into that config, other servers in it dropped, an
// existing entry overwritten without asking, or a dry run that changes files.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
const ORIGIN = "https://pipeshub.example.com";
const ACCESS = "e30.eyJ1c2VySWQiOiJ1In0.sig";

let home = "";

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pipeshub-mcp-install-"));
  await mkdir(join(home, ".config", "pipeshub"), { recursive: true });
  // A current sign-in, so nothing here needs the network.
  await writeFile(join(home, ".config", "pipeshub", "credentials.json"), JSON.stringify({
    origin: ORIGIN,
    clientId: "pipeshub-agent",
    tokenEndpoint: `${ORIGIN}/api/v1/oauth2/token`,
    accessToken: ACCESS,
    refreshToken: "refresh-1",
    expiresAt: Date.now() + 3_600_000,
  }), { mode: 0o600 });
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

const ENTRY_ARGS = ["-y", "@pipeshub-ai/mcp", "start", "--server-url", ORIGIN];

describe("pipeshub mcp install", () => {
  test("cursor: merges the entry, keeps other servers, and writes no token", async () => {
    const path = join(home, ".cursor", "mcp.json");
    await mkdir(join(home, ".cursor"));
    await writeFile(path, JSON.stringify({ mcpServers: { other: { command: "x" } }, theme: "dark" }));

    const r = await cli(["--client", "cursor"]);
    expect(r.code).toBe(0);
    const config = JSON.parse(await readFile(path, "utf8"));
    expect(config).toEqual({
      mcpServers: { other: { command: "x" }, pipeshub: { command: "npx", args: ENTRY_ARGS } },
      theme: "dark",
    });
    expect(await readFile(path, "utf8")).not.toContain(ACCESS);
  });

  test("an existing pipeshub entry is kept unless --force", async () => {
    await cli(["--client", "cursor"]);
    const again = await cli(["--client", "cursor"]);
    expect(again.code).toBe(2);
    expect(again.stderr).toContain("--force");
    expect((await cli(["--client", "cursor", "--force"])).code).toBe(0);
  });

  test("codex: appends the table to config.toml and keeps what was there", async () => {
    const path = join(home, ".codex", "config.toml");
    await mkdir(join(home, ".codex"));
    await writeFile(path, 'model = "o4"');

    expect((await cli(["--client", "codex"])).code).toBe(0);
    expect(await readFile(path, "utf8")).toBe(
      'model = "o4"\n\n[mcp_servers.pipeshub]\ncommand = "npx"\n'
        + `args = [${ENTRY_ARGS.map((a) => JSON.stringify(a)).join(", ")}]\n`,
    );
    expect((await cli(["--client", "codex"])).code).toBe(2);
  });

  test("claude-code: runs claude's own mcp add, user scope", async () => {
    const bin = join(home, "bin");
    await mkdir(bin);
    const record = join(home, "claude-args.json");
    await writeFile(join(bin, "claude"), `#!/bin/sh\nprintf '%s\\n' "$@" > ${JSON.stringify(record)}\n`);
    await chmod(join(bin, "claude"), 0o755);

    const r = await cli(["--client", "claude-code"], { PATH: `${bin}:${process.env["PATH"] ?? ""}` });
    expect(r.code).toBe(0);
    expect((await readFile(record, "utf8")).trim().split("\n"))
      .toEqual(["mcp", "add", "--scope", "user", "pipeshub", "--", "npx", ...ENTRY_ARGS]);
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
    const r = await cli(["--client", "cursor", "--dry-run"], {
      PIPESHUB_TOKEN: "env-token",
      PIPESHUB_BASE_URL: ORIGIN,
    });
    expect(JSON.parse(r.stdout).note).toContain("pipeshub login");
  });

  test("an unknown client is a usage error", async () => {
    expect((await cli(["--client", "vim"])).code).toBe(2);
  });
});
