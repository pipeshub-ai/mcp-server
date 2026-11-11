import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Command and flag parsing happens BEFORE any credential or sandbox check, so a
// typo or a --dry-run never looks like an authentication problem. Each case
// runs the binary with an empty environment: no token, no origin, fake HOME.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
let home: string;
beforeAll(async () => { home = await mkdtemp(join(tmpdir(), "standalone-cli-")); });
afterAll(async () => { await rm(home, { recursive: true, force: true }); });

async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    cwd: home,
    env: { PATH: "/usr/bin:/bin", HOME: home, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, stdout, stderr };
}

const visible = async () => (await readdir(home)).filter((n) => n !== ".bun");

describe("unknown commands", () => {
  test("a typo is a usage error that names the command, not a credential error", async () => {
    for (const bad of ["serch", "frob", "initt", "mcpp"]) {
      const r = await cli([bad, "x"]);
      expect(r.code).toBe(2);
      expect(r.stderr).toBe(`pipeshub: unknown command: ${bad}. Run 'pipeshub --help' for the list.\n`);
    }
  });

  test("it is the same with a token and an origin set", async () => {
    const r = await cli(["frob"], { PIPESHUB_TOKEN: "t0", PIPESHUB_BASE_URL: "http://127.0.0.1:9" });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("unknown command: frob");
  });

  test("known commands with no credential still get the credential error (exit 3 / 2 as before)", async () => {
    const r = await cli(["search", "x"], { PIPESHUB_BASE_URL: "http://127.0.0.1:9" });
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("No PipesHub credential found");
  });

  test("an unknown option still fails loudly", async () => {
    expect((await cli(["init", "--local", "--dry-runn"])).code).toBe(2);
  });
});

describe("--dry-run needs no credential", () => {
  test("mcp install --dry-run with an origin and no token exits 0 and writes nothing", async () => {
    const r = await cli(["mcp", "install", "--client", "cursor", "--dry-run"], { PIPESHUB_BASE_URL: "http://127.0.0.1:3000" });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).dryRun).toBe(true);
    expect(await visible()).toEqual([]);
  });

  test("mcp install with no address says what to set, as a usage error", async () => {
    const r = await cli(["mcp", "install", "--client", "cursor", "--dry-run"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("PIPESHUB_BASE_URL");
    expect(r.stderr).not.toContain("sandbox");
  });

  test("mcp install for a client only init knows points at init", async () => {
    const r = await cli(["mcp", "install", "--client", "windsurf", "--dry-run"], { PIPESHUB_BASE_URL: "http://127.0.0.1:3000" });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("pipeshub init --local --client windsurf");
  });

  test("init --dry-run and uninstall --dry-run run with nothing set and change nothing", async () => {
    const a = await cli(["init", "--local", "--dry-run", "--no-start", "--client", "cursor"]);
    expect(a.code).toBe(0);
    expect(a.stdout).toContain("Dry run: nothing was changed.");
    expect(a.stdout).toContain(join(home, ".cursor", "mcp.json"));
    const b = await cli(["uninstall", "--dry-run"]);
    expect(b.code).toBe(0);
    expect(await visible()).toEqual([]);
  });
});

describe("init and dev flags", () => {
  test("an unknown --client is a usage error that lists the clients", async () => {
    const r = await cli(["init", "--local", "--client", "notepad", "--dry-run"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("claude-code, codex, claude-desktop, cursor, windsurf, vscode, gemini, zed, cline");
  });

  test("--port must be a port number", async () => {
    for (const p of ["0", "70000", "x", "3.5"]) expect((await cli(["dev", "up", "--port", p])).code).toBe(2);
    expect((await cli(["init", "--local", "--port"])).stderr).toContain("--port requires a value");
  });

  test("dev needs a subcommand", async () => {
    const r = await cli(["dev"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("usage: pipeshub dev up|down|status");
  });

  test("dev status works with no stack and reports whether Docker is usable", async () => {
    const r = await cli(["dev", "status"]);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.configured).toBe(false);
    expect(typeof out.docker).toBe("string");
  });

  test("dev down with nothing started is not an error", async () => {
    const r = await cli(["dev", "down"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).stopped).toBe(false);
  });

  test("the usage text lists the new commands and flags", async () => {
    const r = await cli(["--help"]);
    for (const w of ["init ", "uninstall", "dev up|down|status", "index [path]", "--yes", "--uninstall", "--project", "--watch", "--no-start"]) {
      expect(r.stdout).toContain(w);
    }
  });
});

describe("a dry run does not wait on Docker", () => {
  test("a docker that hangs costs a few seconds at most, and shows as a warning", async () => {
    const bin = join(home, "slow-bin");
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, "docker"), "#!/bin/sh\nsleep 30\n", { mode: 0o755 });
    const t0 = Date.now();
    const r = await cli(["init", "--local", "--dry-run", "--client", "cursor"], { PATH: `${bin}:/usr/bin:/bin` });
    expect(r.code).toBe(0);
    expect(Date.now() - t0).toBeLessThan(10_000);
    expect(r.stdout).toContain("Docker");
  }, 20_000);
});

describe("every command in the usage text dispatches", () => {
  test("none of them is reported as unknown", async () => {
    const help = (await cli(["--help"])).stdout;
    const section = help.split("COMMANDS\n")[1]!.split("\nOPTIONS")[0]!;
    const words = [...new Set(section.split("\n").map((l) => /^  ([a-z][a-z-]*)\b/.exec(l)?.[1]).filter((w): w is string => !!w))];
    expect(words).toContain("add-web");
    for (const w of words.filter((x) => x !== "start")) { // `start` serves MCP on stdin until it closes
      // Nothing listens on port 9, so a command that does get dispatched fails fast and offline.
      const r = await cli([w, "--url", "http://127.0.0.1:9"], { PIPESHUB_BASE_URL: "http://127.0.0.1:9" });
      expect(r.stderr).not.toContain("unknown command");
    }
  }, 60_000);
});

describe("index", () => {
  test("outside a git repository it is a usage error", async () => {
    // The temp dir may itself sit inside a checkout; stop git's search at its parent.
    const r = await cli(["index", home], { GIT_CEILING_DIRECTORIES: join(home, "..") });
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("git");
  });
});
