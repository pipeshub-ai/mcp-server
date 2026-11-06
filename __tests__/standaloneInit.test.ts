import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// `pipeshub init` as a person runs it: a child process with a fake HOME (so no
// real agent config is ever touched) against a fake local PipesHub. The same
// flow runs against a real slim stack in standaloneE2e.test.ts.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");

let root: string;
let fake: FakeLocal;
beforeAll(async () => { root = await mkdtemp(join(tmpdir(), "standalone-init-")); });
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
// Each test gets a fresh stack (no account yet) unless its describe says otherwise.
const freshStack = () => { beforeEach(() => { fake = startFakeLocal(); }); afterEach(() => fake.stop()); };

interface Run { code: number; stdout: string; stderr: string }

/**
 * The stack `dev up` started: its state.json, and a `docker` that says its container publishes the port. `init` creates the first
 * account only on a PipesHub it can show is its own, never on whatever listens at --url.
 */
async function ownTheStack(home: string, origin: string): Promise<Record<string, string>> {
  const port = new URL(origin).port;
  await mkdir(join(home, ".pipeshub", "standalone"), { recursive: true });
  await writeFile(join(home, ".pipeshub", "standalone", "state.json"), JSON.stringify({ project: "t", port: Number(port), origin }));
  const docker = join(dirname(home), "docker-shim");
  await writeFile(docker, `#!/bin/sh\ncase "$*" in *" port "*) echo "127.0.0.1:${port}" ;; esac\nexit 0\n`, { mode: 0o755 });
  return { PIPESHUB_DOCKER: docker };
}

async function cli(home: string, cwd: string, args: string[], env: Record<string, string> = {}): Promise<Run> {
  const url = args[args.indexOf("--url") + 1];
  const owned = args.includes("--url") && !("NOT_OURS" in env) && url ? await ownTheStack(home, url) : {};
  delete env["NOT_OURS"];
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    cwd,
    env: { PATH: "/usr/bin:/bin", HOME: home, ...owned, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, stdout, stderr };
}

async function world(name: string, clients: string[]) {
  const home = join(root, name, "home");
  const cwd = join(root, name, "project");
  await mkdir(cwd, { recursive: true });
  for (const d of clients) await mkdir(join(home, d), { recursive: true });
  return { home, cwd };
}

async function tree(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.name === ".bun" || e.name === ".pipeshub") continue; // the runtime's cache and the (faked) stack's state, not what init wrote
    if (e.isDirectory()) out.push(...(await tree(p)));
    else out.push(p);
  }
  return out.sort();
}

describe("init twice against one fresh local PipesHub", () => {
  beforeAll(() => { fake = startFakeLocal(); });
  afterAll(() => fake.stop());

  test("creates the first account, stores the sign-in privately, writes every detected client, and never writes a secret into a config", async () => {
    const w = await world("fresh", [".claude", ".codex", ".cursor", ".gemini", ".config/zed", ".codeium/windsurf", ".config/Code/User"]);
    await writeFile(join(w.home, ".config/zed/settings.json"), '// Zed settings\n{\n  "theme": "One Dark", // mine\n}\n');
    await writeFile(join(w.home, ".gemini/settings.json"), '{ "theme": "dark" }\n');

    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--project", "--url", fake.origin]);
    expect(r.stderr).not.toContain(fake.issuedToken);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("created the first account");
    expect(r.stderr).toContain("Found Claude Code, Codex, Cursor, Windsurf, VS Code, Gemini CLI, Zed.");

    // the token and the account live only in the CLI's own store, 0600
    const store = join(w.home, ".config", "pipeshub");
    for (const f of ["credentials.json", "local-account.json", "init-manifest.json"]) {
      expect((await stat(join(store, f))).mode & 0o777).toBe(0o600);
    }
    const creds = JSON.parse(await readFile(join(store, "credentials.json"), "utf8"));
    expect(creds.accessToken).toBe(fake.issuedToken);
    expect(creds.origin).toBe(fake.origin);

    // every file init wrote
    const written = (await tree(w.home)).concat(await tree(w.cwd)).filter((f) => !f.startsWith(store));
    const names = written.map((f) => f.slice(root.length));
    for (const want of [
      "/fresh/home/.claude.json", "/fresh/home/.claude/skills/pipeshub/SKILL.md", "/fresh/project/CLAUDE.md",
      "/fresh/home/.codex/config.toml", "/fresh/home/.codex/AGENTS.md", "/fresh/project/AGENTS.md",
      "/fresh/home/.cursor/mcp.json", "/fresh/project/.cursor/rules/pipeshub.mdc",
      "/fresh/home/.codeium/windsurf/mcp_config.json", "/fresh/project/.windsurf/rules/pipeshub.md",
      "/fresh/home/.config/Code/User/mcp.json", "/fresh/project/.github/instructions/pipeshub.instructions.md",
      "/fresh/home/.gemini/settings.json", "/fresh/home/.gemini/GEMINI.md",
      "/fresh/home/.config/zed/settings.json", "/fresh/project/.rules",
    ]) expect(names).toContain(want);

    // the person's own settings survived
    expect(await readFile(join(w.home, ".config/zed/settings.json"), "utf8")).toContain("// Zed settings");
    expect(JSON.parse(await readFile(join(w.home, ".gemini/settings.json"), "utf8")).theme).toBe("dark");

    // NO secret in any agent file: not the token, not the account password
    const password = fake.password!;
    expect(password.length).toBeGreaterThan(16);
    for (const f of written) {
      const text = await readFile(f, "utf8");
      expect(text).not.toContain(fake.issuedToken);
      expect(text).not.toContain(password);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}|session-[0-9a-f]{12}/);
    }
    expect(r.stdout).not.toContain(password);
    expect(r.stdout).not.toContain(fake.issuedToken);
    // and the entries point at the local stack, chat off
    const cursor = JSON.parse(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).mcpServers.pipeshub;
    expect(cursor.args).toContain(fake.origin);
    expect(cursor.env).toEqual({ PIPESHUB_MCP_CHAT: "off" });
  });

  test("a second run changes nothing: same bytes, no new backups, no new account or token", async () => {
    const w = await world("fresh", []); // same world as above
    const before = new Map<string, string>();
    for (const f of (await tree(w.home)).concat(await tree(w.cwd))) before.set(f, await readFile(f, "utf8"));
    const backupsBefore = [...before.keys()].filter((f) => f.includes("/backups/")).length;
    expect(backupsBefore).toBe(2); // zed and gemini settings existed before the first run
    const accountCalls = fake.log.filter((l) => l === "POST /api/v1/org" || l === "POST /api/v1/personal-access-tokens").length;

    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--project", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("already signed in");
    expect(r.stdout).not.toMatch(/^(Created|Updated) /m);
    const after = (await tree(w.home)).concat(await tree(w.cwd));
    expect(after).toEqual([...before.keys()].sort());
    for (const [f, text] of before) {
      if (f.endsWith("init-manifest.json")) continue;
      expect(await readFile(f, "utf8")).toBe(text);
    }
    expect(fake.log.filter((l) => l === "POST /api/v1/org" || l === "POST /api/v1/personal-access-tokens").length).toBe(accountCalls);
    expect(after.filter((f) => f.includes("/backups/")).length).toBe(backupsBefore);
  });

});

describe("init options", () => {
  freshStack();

  test("a file that existed is backed up before it is edited", async () => {
    const w = await world("backup", [".cursor"]);
    const original = '{ "mcpServers": { "other": { "command": "x" } } }\n';
    await writeFile(join(w.home, ".cursor/mcp.json"), original);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    const backups = (await tree(join(w.home, ".config/pipeshub/backups"))).filter((f) => f.endsWith("mcp.json"));
    expect(backups).toHaveLength(1);
    expect(await readFile(backups[0]!, "utf8")).toBe(original);
  });

  test("--dry-run prints every change and writes nothing at all", async () => {
    const w = await world("dry", [".cursor", ".codex"]);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--dry-run", "--project", "--url", fake.origin], { NOT_OURS: "1" });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Dry run: nothing was changed.");
    expect(r.stdout).toContain(join(w.home, ".cursor/mcp.json"));
    expect(r.stdout).toContain(join(w.home, ".codex/config.toml"));
    expect(r.stdout).toContain(join(w.cwd, "AGENTS.md"));
    expect(r.stdout).toContain('"PIPESHUB_MCP_CHAT": "off"');
    expect(await tree(w.home)).toEqual([]);
    expect(await tree(w.cwd)).toEqual([]);
    // it also did not sign in or touch the stack's accounts
    const asked = fake.log.length;
    await cli(w.home, w.cwd, ["init", "--local", "--dry-run", "--url", fake.origin]);
    expect(fake.log.length).toBe(asked);
  });

  test("signs in with the device grant, approved by init on loopback: a refresh token is stored, no personal token is minted", async () => {
    const w = await world("device", [".cursor"]);
    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin])).code).toBe(0);
    const creds = JSON.parse(await readFile(join(w.home, ".config/pipeshub/credentials.json"), "utf8"));
    expect(creds.accessToken).toBe(fake.issuedToken);
    expect(creds.refreshToken).toMatch(/^refresh-/);
    expect(creds.tokenEndpoint).toBe(`${fake.origin}/api/v1/oauth2/token`);
    const asked = fake.log.filter((l) => l.startsWith("POST /api/v1/oauth2/"));
    expect(asked).toContain("POST /api/v1/oauth2/device_authorization");
    expect(asked).toContain("POST /api/v1/oauth2/device/consent");
    expect(fake.log.some((l) => l.includes("personal-access-tokens"))).toBe(false);
    // the account's password is kept only for the next approval, in the CLI's own store
    expect((await stat(join(w.home, ".config/pipeshub/local-account.json"))).mode & 0o777).toBe(0o600);
  });

  test("an account init did not create is signed in from the browser: the link and code are shown, and it waits", async () => {
    const other = startFakeLocal({ orgExists: true, deviceExpiresIn: 1 });
    try {
      const w = await world("browser", [".cursor"]);
      const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", other.origin]);
      expect(r.stderr).toContain(`${other.origin}/device?user_code=CODE-1`);
      expect(r.stdout).not.toContain("already signed in");
      expect(r.code).toBe(3); // nobody approved it before the code expired
      expect(other.log.some((l) => l.includes("device/consent"))).toBe(false);
    } finally {
      other.stop();
    }
  });

  test("project files are written only when asked (--project)", async () => {
    const w = await world("noproj", [".codex"]);
    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin])).code).toBe(0);
    expect(await tree(w.cwd)).toEqual([]);
  });

  test("--json prints a machine-readable report", async () => {
    const w = await world("json", [".cursor"]);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--json", "--url", fake.origin]);
    const report = JSON.parse(r.stdout);
    expect(report.clients).toEqual(["cursor"]);
    expect(report.files[0].status).toBe("created");
    expect(JSON.stringify(report)).not.toContain(fake.issuedToken);
  });

  test("with no agent installed it says so and still exits 0", async () => {
    const w = await world("none", []);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("No supported coding agent found");
    expect(r.stderr).not.toContain("Found");
  });

  test("--client limits what is written; a malformed file is reported, left alone, and fails the run", async () => {
    const w = await world("bad", [".cursor", ".gemini"]);
    await writeFile(join(w.home, ".cursor/mcp.json"), '{ "mcpServers": ');
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--client", "cursor,gemini", "--url", fake.origin]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("Cannot edit");
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe('{ "mcpServers": ');
    expect(JSON.parse(await readFile(join(w.home, ".gemini/settings.json"), "utf8")).mcpServers.pipeshub).toBeDefined();
  });

  test("a stored sign-in for another origin is not reused", async () => {
    const other = startFakeLocal({ orgExists: true, deviceExpiresIn: 1 });
    try {
      const w = await world("other", [".cursor"]);
      await mkdir(join(w.home, ".config/pipeshub"), { recursive: true });
      await writeFile(join(w.home, ".config/pipeshub/credentials.json"), JSON.stringify({
        origin: fake.origin, clientId: "c", tokenEndpoint: fake.origin + "/t", accessToken: "x", expiresAt: Date.now() + 3_600_000 }));
      await chmod(join(w.home, ".config/pipeshub/credentials.json"), 0o600);
      const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", other.origin]);
      expect(r.stdout).not.toContain("already signed in");
    } finally {
      other.stop();
    }
  });
});

describe("uninstall", () => {
  freshStack();

  test("removes every file init added, restores edited files, revokes the token, and forgets the account", async () => {
    const w = await world("undo", [".cursor", ".codex", ".config/zed"]);
    const zed = '// Zed\n{\n  "theme": "One Dark"\n}\n';
    const notes = "# My AGENTS notes\n\nKeep.\n";
    await writeFile(join(w.home, ".config/zed/settings.json"), zed);
    await writeFile(join(w.cwd, "AGENTS.md"), notes);
    const snapshot = async () => new Map(await Promise.all((await tree(w.home)).concat(await tree(w.cwd)).filter((f) => !f.includes("/.config/pipeshub/")).map(async (f) => [f, await readFile(f, "utf8")] as const)));
    const empty = await snapshot();

    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--project", "--url", fake.origin])).code).toBe(0);
    expect((await snapshot()).size).toBeGreaterThan(empty.size);

    const dry = await cli(w.home, w.cwd, ["init", "--local", "--uninstall", "--dry-run"]);
    expect(dry.code).toBe(0);
    expect(dry.stdout).toContain("Would");

    const r = await cli(w.home, w.cwd, ["uninstall"]);
    expect(r.code).toBe(0);
    expect(fake.revoked).toContain(fake.issuedToken);
    expect(r.stdout).toContain("asked the server to revoke it");
    const after = await snapshot();
    expect([...after.keys()]).toEqual([...empty.keys()]);
    expect(after.get(join(w.home, ".config/zed/settings.json"))).toBe(zed);
    expect(after.get(join(w.cwd, "AGENTS.md"))).toBe(notes);
    expect(await tree(join(w.home, ".config/pipeshub")).then((t) => t.filter((f) => /credentials|local-account|manifest/.test(f)))).toEqual([]);
    // twice is fine
    expect((await cli(w.home, w.cwd, ["uninstall"])).code).toBe(0);
  });

  test("an entry the person wrote under the same name is left alone", async () => {
    const w = await world("mine", [".cursor"]);
    const theirs = '{\n  "mcpServers": {\n    "pipeshub": { "command": "my-own" }\n  }\n}\n';
    await writeFile(join(w.home, ".cursor/mcp.json"), theirs);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Skipped");
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe(theirs);
    await cli(w.home, w.cwd, ["uninstall"]);
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe(theirs);
  });
});

describe("the next steps name a command the person can type", () => {
  freshStack();

  test("run through npx there is no 'pipeshub' on the path, so the hints say npx; installed, they say pipeshub", async () => {
    const via = await world("hint-npx", [".cursor"]);
    const npx = await cli(via.home, via.cwd, ["init", "--local", "--yes", "--url", fake.origin], { npm_command: "exec" });
    expect(npx.stdout).toContain("npx @pipeshub-ai/standalone index");
    expect(npx.stdout).toContain("npx @pipeshub-ai/standalone uninstall");
    expect(npx.stdout).not.toMatch(/: pipeshub index/);

    fake.stop();
    fake = startFakeLocal(); // a fresh stack: this home has no account on the first one
    const installed = await world("hint-installed", [".cursor"]);
    const plain = await cli(installed.home, installed.cwd, ["init", "--local", "--yes", "--url", fake.origin]);
    expect(plain.stdout).toContain("pipeshub index");
    expect(plain.stdout).not.toContain("npx @pipeshub-ai/standalone index");
  }, 30_000);
});

describe("uninstall gives back the person's files exactly", () => {
  freshStack();

  const seeds: Record<string, string> = {
    ".cursor/mcp.json": '{"mcpServers":{"other":{"command":"echo"}}}',                  // compact, no final newline
    ".codeium/windsurf/mcp_config.json": '{"mcpServers":{}}',                              // an empty servers object
    ".config/zed/settings.json": '// Zed\n{\n  "vim_mode": true, // yes\n}\n',            // JSONC with a trailing comma
    ".gemini/settings.json": '{\r\n\t"theme": "dark"\r\n}\r\n',                            // tabs and CRLF
    ".codex/config.toml": 'model = "gpt-5"\n',
  };

  async function dirs(root: string): Promise<string[]> {
    const out: string[] = [];
    for (const e of await readdir(root, { withFileTypes: true }).catch(() => [])) {
      if (!e.isDirectory() || e.name === ".bun" || e.name === ".pipeshub") continue;
      out.push(join(root, e.name), ...(await dirs(join(root, e.name))));
    }
    return out.sort();
  }

  test("init then uninstall leaves every file byte for byte and every directory as it was", async () => {
    const w = await world("exact", [".claude"]);
    for (const [rel, body] of Object.entries(seeds)) {
      await mkdir(join(w.home, rel, ".."), { recursive: true });
      await writeFile(join(w.home, rel), body);
    }
    const ours = (f: string) => f.includes("/.config/pipeshub");
    const filesBefore = (await tree(w.home)).filter((f) => !ours(f));
    const dirsBefore = (await dirs(w.home)).filter((f) => !ours(f));
    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin])).code).toBe(0);
    expect(await readFile(join(w.home, ".claude/skills/pipeshub/SKILL.md"), "utf8")).toContain("pipeshub");
    expect((await cli(w.home, w.cwd, ["uninstall"])).code).toBe(0);
    expect((await tree(w.home)).filter((f) => !ours(f))).toEqual(filesBefore);
    for (const [rel, body] of Object.entries(seeds)) expect(await readFile(join(w.home, rel), "utf8"), rel).toBe(body);
    expect((await dirs(w.home)).filter((f) => !ours(f))).toEqual(dirsBefore);
  }, 30_000);

  test("a file the person changed after init is edited, not overwritten", async () => {
    const w = await world("edited", [".cursor"]);
    await writeFile(join(w.home, ".cursor/mcp.json"), '{"mcpServers":{"other":{"command":"echo"}}}');
    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin])).code).toBe(0);
    const mine = JSON.parse(await readFile(join(w.home, ".cursor/mcp.json"), "utf8"));
    mine.mcpServers.added = { command: "later" };
    await writeFile(join(w.home, ".cursor/mcp.json"), JSON.stringify(mine, null, 2));
    expect((await cli(w.home, w.cwd, ["uninstall"])).code).toBe(0);
    const after = JSON.parse(await readFile(join(w.home, ".cursor/mcp.json"), "utf8"));
    expect(Object.keys(after.mcpServers).sort()).toEqual(["added", "other"]);
  }, 30_000);

  test("the backups of the person's files are private", async () => {
    const w = await world("private", [".cursor"]);
    await writeFile(join(w.home, ".cursor/mcp.json"), '{"mcpServers":{}}');
    expect((await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin])).code).toBe(0);
    const b = (await tree(join(w.home, ".config/pipeshub/backups"))).filter((f) => f.endsWith("mcp.json"));
    expect(b).toHaveLength(1);
    expect((await stat(b[0]!)).mode & 0o777).toBe(0o600);
  });
});

describe("init indexes the repository it is run in", () => {
  freshStack();
  const git = (cwd: string, ...a: string[]) => {
    const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
  };
  const ceiling = () => ({ GIT_CEILING_DIRECTORIES: root });
  const pushed = () => fake.log.filter((l) => l.includes("/api/v1/local-repos"));
  async function repoWorld(name: string, makeRepo: boolean) {
    const w = await world(name, [".cursor"]);
    await writeFile(join(w.cwd, "a.py"), "def a():\n    return 1\n");
    if (makeRepo) { git(w.cwd, "init", "-q"); git(w.cwd, "add", "-A"); }
    fake.mcp.tools = [{ name: "pipeshub_code_repos", inputSchema: { type: "object" } }];
    return w;
  }

  test("inside a git repository: the one command indexes it and says so in a few lines", async () => {
    const w = await repoWorld("in-repo", true);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin], ceiling());
    expect(r.code).toBe(0);
    expect(r.stderr).toContain("Indexing");
    expect([...fake.repo.files.keys()]).toEqual(["a.py"]);
    expect(fake.repo.commits).toBe(1);
    expect(r.stdout).toMatch(/^Code: +project: 1 file, ready/m);
    expect(r.stdout).not.toContain("Index this repository's code"); // nothing left to do
    expect(r.stdout.split("\n").length).toBeLessThan(16);
  }, 30_000);

  test("a repository that is the home directory is never indexed", async () => {
    const w = await repoWorld("home-repo", true);
    git(w.home, "init", "-q");
    const r = await cli(w.home, w.home, ["init", "--local", "--yes", "--url", fake.origin], ceiling());
    expect(r.code).toBe(0);
    expect(pushed()).toEqual([]);
    expect(r.stdout).toContain("home directory");
  }, 30_000);

  test("outside a git repository: nothing is pushed and the hint says how to index one", async () => {
    const w = await repoWorld("no-repo", false);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin], ceiling());
    expect(r.code).toBe(0);
    expect(pushed()).toEqual([]);
    expect(r.stdout).toContain("Index a repository's code");
    expect(r.stdout).not.toMatch(/^Code:/m);
  }, 30_000);

  test("--no-index leaves the repository alone and keeps the hint", async () => {
    const w = await repoWorld("opt-out", true);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--no-index", "--url", fake.origin], ceiling());
    expect(r.code).toBe(0);
    expect(pushed()).toEqual([]);
    expect(r.stdout).toContain("Index this repository's code");
  }, 30_000);

  test("a repository that cannot be indexed does not undo the setup: a warning, exit 0", async () => {
    const w = await repoWorld("refused", true);
    fake.repo.status = "stuck";
    fake.repo.error = "the sync of this repository did not start";
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin], ceiling());
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Warning");
    expect(r.stdout).toContain("did not start");
    expect(JSON.parse(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).mcpServers.pipeshub).toBeDefined();
  }, 30_000);

  test("--dry-run says it would index and pushes nothing", async () => {
    const w = await repoWorld("dry-index", true);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--dry-run", "--url", fake.origin], ceiling());
    expect(r.stdout).toContain("would index");
    expect(pushed()).toEqual([]);
  });

  test("the installed skill tells the agent to call index_workspace when the open folder is not indexed", async () => {
    const w = await repoWorld("skill", false);
    await mkdir(join(w.home, ".claude"), { recursive: true });
    await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin], ceiling());
    const skill = await readFile(join(w.home, ".claude/skills/pipeshub/SKILL.md"), "utf8");
    expect(skill).toMatch(/index_workspace/);
    expect(skill).toMatch(/not (been )?indexed|no repository/i);
  }, 30_000);
});


describe("the first account is created only on a stack init can show is its own", () => {
  freshStack();

  test("a listener at --url that is not the stack dev up started never receives the generated password", async () => {
    const w = await world("not-ours", [".cursor"]);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin], { NOT_OURS: "1" });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("create the first account");
    expect(fake.log).not.toContain("POST /api/v1/org");
    expect(fake.password).toBeNull();
  }, 30_000);

  test("one that is (state.json, and docker shows the container publishing that port) gets the account", async () => {
    const w = await world("ours", [".cursor"]);
    const r = await cli(w.home, w.cwd, ["init", "--local", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("created the first account");
  }, 30_000);
});
