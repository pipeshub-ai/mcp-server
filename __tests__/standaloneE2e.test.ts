import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { postMcp } from "../src/cli/client.js";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The whole developer journey against a REAL slim stack that `pipeshub dev up`
// starts: dev up -> init -> configs written -> the stdio bridge answers
// tools/list -> a search returns a document -> no secret in any agent file ->
// init again changes nothing -> uninstall.
//
// Needs Docker, the built bridge (npm run build) and the slim images. It runs
// only when PIPESHUB_E2E=1 (npm run test:e2e), and then a missing dependency
// FAILS the run rather than skipping. Image names come from the environment the
// compose file reads: PIPESHUB_IMAGE, IMAGE_TAG, PG_IMAGE, PG_TAG, PIPESHUB_MIGRATE_IMAGE, MIGRATE_TAG.
// This repo's CI runs `bun test` without Docker, so this is skipped there on purpose.

const RUN = process.env["PIPESHUB_E2E"] === "1";
const PORT = process.env["PIPESHUB_E2E_PORT"] ?? "64610";
const PROJECT = process.env["PIPESHUB_E2E_PROJECT"] ?? "standalone-e2e";
const ROOT = join(import.meta.dir, "..");
const CLI = join(ROOT, "src", "cli", "pipeshub.ts");
const BRIDGE = join(ROOT, "bin", "mcp-server.js");
const MARKER = "saffronlever" + Math.random().toString(36).slice(2, 8);

let base: string;
let home: string;
let project: string;
let origin = "";
let t0 = 0;
let firstAnswerSeconds = 0;

async function cli(args: string[], timeoutMs = 120_000) {
  const env: Record<string, string> = { PATH: "/usr/bin:/bin:/usr/local/bin", HOME: home, PIPESHUB_PROJECT: PROJECT };
  for (const k of ["PIPESHUB_IMAGE", "IMAGE_TAG", "PG_IMAGE", "PG_TAG", "PIPESHUB_MIGRATE_IMAGE", "MIGRATE_TAG", "APP_MEMORY_LIMIT"]) {
    if (process.env[k]) env[k] = process.env[k]!;
  }
  const proc = Bun.spawn([process.execPath, CLI, ...args], { cwd: project, env, stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  clearTimeout(timer);
  return { code, stdout, stderr };
}

async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.name === ".bun") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out.sort();
}

async function bridge(): Promise<Client> {
  // The entry exactly as the agent's config has it; only `npx -y @pipeshub-ai/mcp@...` is swapped for this checkout's build.
  const e = JSON.parse(await readFile(join(home, ".cursor", "mcp.json"), "utf8")).mcpServers.pipeshub as { command: string; args: string[]; env: Record<string, string> };
  expect(e.args.slice(0, 2)).toEqual(["-y", "@pipeshub-ai/mcp@>=4.10.0"]);
  const t = new StdioClientTransport({
    command: "node",
    args: [BRIDGE, ...e.args.slice(2)],
    env: { PATH: "/usr/bin:/bin:/usr/local/bin", HOME: home, ...e.env },
    stderr: "pipe",
  });
  const c = new Client({ name: "standalone-e2e", version: "0" });
  await c.connect(t);
  return c;
}

async function session(): Promise<string> {
  const a = JSON.parse(await readFile(join(home, ".config", "pipeshub", "local-account.json"), "utf8"));
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(origin + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const init = await post("/api/v1/userAccount/initAuth", { email: a.email });
  const auth = await post("/api/v1/userAccount/authenticate", { method: "password", credentials: { password: a.password }, email: a.email }, { "x-session-token": init.headers.get("x-session-token")! });
  return ((await auth.json()) as { accessToken: string }).accessToken;
}

async function seedDocument(): Promise<void> {
  const token = await session();
  const auth = { authorization: `Bearer ${token}` };
  let kb = "";
  for (let i = 0; i < 40 && !kb; i++) {
    const r = await fetch(origin + "/api/v1/knowledgeBase/", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ kbName: "e2e" }) });
    const body = (await r.json().catch(() => ({}))) as Record<string, any>;
    kb = body["id"] ?? body["_key"] ?? body["knowledgeBase"]?.id ?? "";
    if (!kb) await new Promise((res) => setTimeout(res, 1500));
  }
  expect(kb).not.toBe("");
  const form = new FormData();
  form.append("files", new Blob([`# Rollback runbook\n\nTo roll back a release use the blue-green switch called ${MARKER}. The owner is Dana Okafor.\n`], { type: "text/markdown" }), "runbook.md");
  form.append("files_metadata", JSON.stringify([{ file_path: "runbook.md", last_modified: Date.now() }]));
  const up = await fetch(`${origin}/api/v1/knowledgeBase/${kb}/upload`, { method: "POST", headers: auth, body: form });
  expect(up.ok).toBe(true);
}

describe.skipIf(!RUN)("standalone init on a real slim stack", () => {
  beforeAll(async () => {
    base = await mkdtemp(join(tmpdir(), "standalone-e2e-"));
    home = join(base, "home");
    project = join(base, "project");
    await mkdir(project, { recursive: true });
    for (const d of [".claude", ".codex", ".cursor", ".gemini", ".config/zed"]) await mkdir(join(home, d), { recursive: true });
    // a real checkout of the bridge is required
    expect((await stat(BRIDGE)).isFile()).toBe(true);
  }, 60_000);

  afterAll(async () => {
    // Always remove the stack and its data, even when a test failed.
    if (home) await cli(["dev", "down", "--volumes"], 300_000).catch(() => undefined);
    if (base) await rm(base, { recursive: true, force: true });
  }, 400_000);

  test("dev up starts the slim stack and it becomes healthy", async () => {
    t0 = Date.now();
    const r = await cli(["dev", "up", "--port", PORT], 900_000);
    expect(r.stderr).not.toContain("failed");
    expect(r.code).toBe(0);
    origin = JSON.parse(r.stdout).origin;
    expect(origin).toBe(`http://127.0.0.1:${PORT}`);
    expect((await fetch(`${origin}/api/v1/health`)).ok).toBe(true);
    const status = JSON.parse((await cli(["dev", "status"])).stdout);
    expect(status).toMatchObject({ docker: "ok", configured: true, healthy: true });
  }, 900_000);

  test("init finds the stack, creates the first account, signs in, and writes the detected agents", async () => {
    const r = await cli(["init", "--local", "--yes", "--project"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("created the first account");
    for (const f of [".claude.json", ".claude/skills/pipeshub/SKILL.md", ".codex/config.toml", ".codex/AGENTS.md", ".cursor/mcp.json", ".gemini/settings.json", ".gemini/GEMINI.md", ".config/zed/settings.json"]) {
      expect((await stat(join(home, f))).isFile()).toBe(true);
    }
    for (const f of ["CLAUDE.md", "AGENTS.md", ".cursor/rules/pipeshub.mdc", ".rules"]) {
      expect((await stat(join(project, f))).isFile()).toBe(true);
    }
    expect((await stat(join(home, ".config/pipeshub/credentials.json"))).mode & 0o777).toBe(0o600);
    const status = JSON.parse((await cli(["auth", "status"])).stdout);
    expect(status).toMatchObject({ connected: true, baseUrl: origin });
    // the device grant, not a minted token: refreshable, and with the slim write scopes
    expect(JSON.parse(await readFile(join(home, ".config/pipeshub/credentials.json"), "utf8")).refreshToken).toBeTruthy();
    expect(status.scopes).toEqual(expect.arrayContaining(["kb:write", "kb:upload", "code:read"]));
  }, 180_000);

  test("the stdio bridge from the written entry lists exactly the server's /mcp tools minus chat, plus index_workspace", async () => {
    const creds = JSON.parse(await readFile(join(home, ".config/pipeshub/credentials.json"), "utf8"));
    const server = (await postMcp({ origin, token: creds.accessToken, insecureHttp: false, requestId: "e2e" }, { method: "tools/list" }, 30_000) as { tools: { name: string }[] }).tools;
    const c = await bridge();
    try {
      const listed = (await c.listTools()).tools;
      const names = listed.map((t) => t.name);
      expect(names.filter((n) => n !== "index_workspace")).toEqual(server.map((t) => t.name).filter((n) => n !== "pipeshub_chat" && n !== "pipeshub_agents"));
      expect(names).toContain("index_workspace");
      expect(names).toContain("pipeshub_search");
      expect(names).not.toContain("pipeshub_chat");
      expect(listed.find((t) => t.name === "pipeshub_search")).toEqual(server.find((t) => t.name === "pipeshub_search") as never);
      // a client with no roots is told what to do
      const r = await c.callTool({ name: "index_workspace", arguments: {} });
      expect(r.isError).toBe(true);
    } finally {
      await c.close();
    }
  }, 60_000);

  test("a document put in PipesHub is found by a search through the bridge", async () => {
    await seedDocument();
    const c = await bridge();
    try {
      let text = "";
      for (let i = 0; i < 100 && !text.includes(MARKER); i++) {
        const r = await c.callTool({ name: "pipeshub_search", arguments: { query: `blue-green switch ${MARKER}`, limit: 5 } });
        text = JSON.stringify(r);
        if (!text.includes(MARKER)) await new Promise((res) => setTimeout(res, 3000));
      }
      expect(text).toContain(MARKER);
      firstAnswerSeconds = Math.round((Date.now() - t0) / 1000);
      console.log(`[standalone-e2e] dev up -> init -> first search hit: ${firstAnswerSeconds} s`);
    } finally {
      await c.close();
    }
  }, 600_000);

  test("no secret is in any agent file: not the token, not the account password", async () => {
    const creds = JSON.parse(await readFile(join(home, ".config/pipeshub/credentials.json"), "utf8"));
    const account = JSON.parse(await readFile(join(home, ".config/pipeshub/local-account.json"), "utf8"));
    const own = [join(home, ".config/pipeshub/credentials.json"), join(home, ".config/pipeshub/local-account.json")];
    const stackDir = join(home, ".pipeshub");
    let scanned = 0;
    for (const f of [...(await files(home)), ...(await files(project))]) {
      if (own.includes(f) || f.startsWith(stackDir)) continue; // the CLI's own store and the stack's own .env
      const text = await readFile(f, "utf8");
      scanned++;
      expect(text).not.toContain(creds.accessToken);
      expect(text).not.toContain(account.password);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    }
    expect(scanned).toBeGreaterThan(10);
    expect(JSON.stringify(creds)).toContain(creds.accessToken);
  });

  test("init again changes nothing", async () => {
    const snap = async () => new Map(await Promise.all([...(await files(home)), ...(await files(project))]
      .filter((f) => !f.includes("/.pipeshub/") && !f.endsWith("init-manifest.json"))
      .map(async (f) => [f, await readFile(f, "utf8")] as const)));
    const before = await snap();
    const r = await cli(["init", "--local", "--yes", "--project"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("already signed in");
    expect(await snap()).toEqual(before);
  });

  test("uninstall removes every file init added and revokes the token", async () => {
    const r = await cli(["uninstall"]);
    expect(r.code).toBe(0);
    for (const f of [".claude.json", ".claude/skills/pipeshub/SKILL.md", ".codex/config.toml", ".cursor/mcp.json", ".gemini/GEMINI.md"]) {
      expect(await stat(join(home, f)).then(() => true, () => false)).toBe(false);
    }
    expect(await files(project)).toEqual([]);
    expect(await stat(join(home, ".config/pipeshub/credentials.json")).then(() => true, () => false)).toBe(false);
  });
});
