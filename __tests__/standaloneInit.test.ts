import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// `pipeshub init` as a person runs it: a child process with a fake HOME (so no
// real agent config is ever touched) against a fake local PipesHub. The same
// flow runs against a real slim stack in standaloneE2e.test.ts.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");

let root: string;
let fake: FakeLocal;
beforeAll(async () => { root = await mkdtemp(join(tmpdir(), "l9a-init-")); });
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
// Each test gets a fresh stack (no account yet) unless its describe says otherwise.
const freshStack = () => { beforeEach(() => { fake = startFakeLocal(); }); afterEach(() => fake.stop()); };

interface Run { code: number; stdout: string; stderr: string }

async function cli(home: string, cwd: string, args: string[], env: Record<string, string> = {}): Promise<Run> {
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    cwd,
    env: { PATH: "/usr/bin:/bin", HOME: home, ...env },
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
    if (e.name === ".bun") continue; // the runtime's own cache, not ours
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

    const r = await cli(w.home, w.cwd, ["init", "--yes", "--project", "--url", fake.origin]);
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

    const r = await cli(w.home, w.cwd, ["init", "--yes", "--project", "--url", fake.origin]);
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
    const r = await cli(w.home, w.cwd, ["init", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    const backups = (await tree(join(w.home, ".config/pipeshub/backups"))).filter((f) => f.endsWith("mcp.json"));
    expect(backups).toHaveLength(1);
    expect(await readFile(backups[0]!, "utf8")).toBe(original);
  });

  test("--dry-run prints every change and writes nothing at all", async () => {
    const w = await world("dry", [".cursor", ".codex"]);
    const r = await cli(w.home, w.cwd, ["init", "--dry-run", "--project", "--url", fake.origin]);
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
    await cli(w.home, w.cwd, ["init", "--dry-run", "--url", fake.origin]);
    expect(fake.log.length).toBe(asked);
  });

  test("the minted token is short-lived on our side: 24 h, renewed silently with the stored account, the old one revoked", async () => {
    const w = await world("renew", [".cursor"]);
    expect((await cli(w.home, w.cwd, ["init", "--yes", "--url", fake.origin])).code).toBe(0);
    const file = join(w.home, ".config/pipeshub/credentials.json");
    const first = JSON.parse(await readFile(file, "utf8"));
    expect(first.expiresAt - Date.now()).toBeLessThanOrEqual(24 * 3_600_000);
    expect(first.expiresAt - Date.now()).toBeGreaterThan(23 * 3_600_000);
    expect(fake.log).toContain("expiryDays 30");
    expect(first.refreshToken).toBeUndefined();

    await writeFile(file, JSON.stringify({ ...first, expiresAt: Date.now() - 1000 }), { mode: 0o600 });
    const r = await cli(w.home, w.cwd, ["search", "anything"]);
    expect(r.stderr).not.toContain("expired");
    const second = JSON.parse(await readFile(file, "utf8"));
    expect(fake.mints).toBe(2);
    expect(second.accessToken).toBe(fake.issuedToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    expect(second.expiresAt).toBeGreaterThan(Date.now() + 23 * 3_600_000);
    expect(fake.revoked).toEqual(["pat1"]);
    // the new token is what a request carries
    expect(fake.mcp.calls.at(-1)?.authorization).toBe(`Bearer ${fake.issuedToken}`);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  test("a lapsed token with no stored account asks for a new sign-in", async () => {
    const w = await world("lapsed", []);
    await mkdir(join(w.home, ".config/pipeshub"), { recursive: true });
    await writeFile(join(w.home, ".config/pipeshub/credentials.json"), JSON.stringify({
      origin: fake.origin, clientId: "personal-access-token", tokenEndpoint: fake.origin + "/t", accessToken: "x", expiresAt: Date.now() - 1000 }), { mode: 0o600 });
    const r = await cli(w.home, w.cwd, ["search", "x"], { PIPESHUB_BASE_URL: fake.origin });
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("expired");
  });

  test("project files are written only when asked (--project)", async () => {
    const w = await world("noproj", [".codex"]);
    expect((await cli(w.home, w.cwd, ["init", "--yes", "--url", fake.origin])).code).toBe(0);
    expect(await tree(w.cwd)).toEqual([]);
  });

  test("--json prints a machine-readable report", async () => {
    const w = await world("json", [".cursor"]);
    const r = await cli(w.home, w.cwd, ["init", "--yes", "--json", "--url", fake.origin]);
    const report = JSON.parse(r.stdout);
    expect(report.clients).toEqual(["cursor"]);
    expect(report.files[0].status).toBe("created");
    expect(JSON.stringify(report)).not.toContain(fake.issuedToken);
  });

  test("with no agent installed it says so and still exits 0", async () => {
    const w = await world("none", []);
    const r = await cli(w.home, w.cwd, ["init", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("No supported coding agent found");
    expect(r.stderr).not.toContain("Found");
  });

  test("--client limits what is written; a malformed file is reported, left alone, and fails the run", async () => {
    const w = await world("bad", [".cursor", ".gemini"]);
    await writeFile(join(w.home, ".cursor/mcp.json"), '{ "mcpServers": ');
    const r = await cli(w.home, w.cwd, ["init", "--yes", "--client", "cursor,gemini", "--url", fake.origin]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("Cannot edit");
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe('{ "mcpServers": ');
    expect(JSON.parse(await readFile(join(w.home, ".gemini/settings.json"), "utf8")).mcpServers.pipeshub).toBeDefined();
  });

  test("a stored sign-in for another origin is not reused", async () => {
    const other = startFakeLocal({ orgExists: true });
    try {
      const w = await world("other", [".cursor"]);
      await mkdir(join(w.home, ".config/pipeshub"), { recursive: true });
      await writeFile(join(w.home, ".config/pipeshub/credentials.json"), JSON.stringify({
        origin: fake.origin, clientId: "c", tokenEndpoint: fake.origin + "/t", accessToken: "x", expiresAt: Date.now() + 3_600_000 }));
      await chmod(join(w.home, ".config/pipeshub/credentials.json"), 0o600);
      // an existing org with an account we did not create: init cannot sign in on its own, so it does not claim to
      const r = await cli(w.home, w.cwd, ["init", "--yes", "--url", other.origin]);
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

    expect((await cli(w.home, w.cwd, ["init", "--yes", "--project", "--url", fake.origin])).code).toBe(0);
    expect((await snapshot()).size).toBeGreaterThan(empty.size);

    const dry = await cli(w.home, w.cwd, ["init", "--uninstall", "--dry-run"]);
    expect(dry.code).toBe(0);
    expect(dry.stdout).toContain("Would");

    const r = await cli(w.home, w.cwd, ["uninstall"]);
    expect(r.code).toBe(0);
    expect(fake.revoked).toContain("pat1");
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
    const r = await cli(w.home, w.cwd, ["init", "--yes", "--url", fake.origin]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Skipped");
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe(theirs);
    await cli(w.home, w.cwd, ["uninstall"]);
    expect(await readFile(join(w.home, ".cursor/mcp.json"), "utf8")).toBe(theirs);
  });
});
