import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The L9 golden path, run the way a developer would, on a real slim stack:
//
//   1. npx @pipeshub-ai/standalone init --yes     (run in a small multi-language git repository: starts the stack, signs in,
//      writes Claude Code + Codex, and indexes the repository)
//   2. ask the agent: the stdio bridge, spawned exactly as the written config says, answers
//      "what calls X" / "what does X call" and a search with a cited hit.
//
// It measures the commands and the wall time from nothing running to the first correct code answer,
// the incremental re-index, the secrets in client configs, and that --uninstall leaves the agents'
// own files byte for byte as they were. Everything happens under a fake HOME.
//
// Needs Docker, `npm run build`, and the slim images named by PIPESHUB_IMAGE / IMAGE_TAG / PG_IMAGE /
// PG_MAJOR / PG_IMAGE_REV (the compose file reads them). Runs only with PIPESHUB_E2E=1 (npm run test:e2e);
// then a missing dependency FAILS rather than skips. GOLDEN_REPORT=<file> writes the numbers as JSON.

const RUN = process.env["PIPESHUB_E2E"] === "1";
const PORT = process.env["PIPESHUB_GOLDEN_PORT"] ?? "64620";
const PROJECT = process.env["PIPESHUB_GOLDEN_PROJECT"] ?? "l9i-golden";
const ROOT = join(import.meta.dir, "..");
const BRIDGE = join(ROOT, "bin", "mcp-server.js");

// One repository, four languages, real call relationships: caller() calls target(), target() calls helper().
const FIXTURE: Record<string, string> = {
  "README.md": "# Shop\n\nA small demo repository.\n",
  "pkg/b.py": "def target(x):\n    return helper(x)\n\n\ndef helper(x):\n    return x\n",
  "pkg/a.py": "from pkg.b import target\n\n\ndef caller():\n    return target(1)\n",
  "src/b.ts": "export function target(x: number): number {\n  return helper(x);\n}\nfunction helper(x: number): number {\n  return x;\n}\n",
  "src/a.ts": "import { target } from './b';\nexport function caller(): number {\n  return target(1);\n}\n",
  "shop/b.go": "package shop\n\nfunc Target(x int) int {\n\treturn helper(x)\n}\n\nfunc helper(x int) int {\n\treturn x\n}\n",
  "shop/a.go": "package shop\n\nfunc Caller() int {\n\treturn Target(1)\n}\n",
  "com/shop/B.java": "package com.shop;\n\npublic class B {\n    public static int target(int x) {\n        return helper(x);\n    }\n    static int helper(int x) {\n        return x;\n    }\n}\n",
  "com/shop/A.java": "package com.shop;\n\nimport com.shop.B;\n\npublic class A {\n    public int caller() {\n        return B.target(1);\n    }\n}\n",
};
// language: [callee file, callee symbol, caller file, caller symbol]
const PAIRS: Record<string, [string, string, string, string]> = {
  python: ["pkg/b.py", "function:target", "pkg/a.py", "function:caller"],
  typescript: ["src/b.ts", "function:target", "src/a.ts", "function:caller"],
  go: ["shop/b.go", "function:Target", "shop/a.go", "function:Caller"],
  java: ["com/shop/B.java", "method:B.target", "com/shop/A.java", "method:A.caller"],
};

let base = "";
let home = "";
let repo = "";
let tarball = "";
let before = new Map<string, string>();
let t0 = 0;
// commands = what the developer types in a shell before the first answer: `npx ... init --yes`.
let npxCalls = 0;
const report: Record<string, number | string | boolean> = {};

const seeded = {
  ".claude.json": JSON.stringify({ numStartups: 7, mcpServers: { other: { command: "echo", args: ["hi"] } } }, null, 2) + "\n",
  ".codex/config.toml": 'model = "gpt-5"\n\n[mcp_servers.other]\ncommand = "echo"\n',
};

async function walk(dir: string, skip: (p: string) => boolean = () => false): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (skip(p) || e.name === ".bun") continue;
    if (e.isDirectory()) out.push(...(await walk(p, skip)));
    else out.push(p);
  }
  return out.sort();
}
// What the person owns: not the CLI's own store, the stack's files, or npm's cache.
const mine = (p: string) => ![".config/pipeshub", ".pipeshub", ".npm"].some((d) => p.startsWith(join(home, d)));

function env(extra: Record<string, string> = {}): Record<string, string> {
  const e: Record<string, string> = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: home, PIPESHUB_PROJECT: PROJECT, npm_config_update_notifier: "false", ...extra };
  for (const k of ["PIPESHUB_IMAGE", "IMAGE_TAG", "PG_IMAGE", "PG_MAJOR", "PG_IMAGE_REV", "APP_MEMORY_LIMIT", "DOCKER_HOST"]) if (process.env[k]) e[k] = process.env[k]!;
  return e;
}

/** `npx @pipeshub-ai/standalone <args>`, with the package taken from the tarball `npm pack` made. */
async function npx(args: string[], cwd: string, timeoutMs = 900_000) {
  npxCalls++;
  const proc = Bun.spawn(["npx", "-y", `--package=${tarball}`, "pipeshub", ...args], { cwd, env: env(), stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  clearTimeout(timer);
  return { code, stdout, stderr };
}

interface Entry { command: string; args: string[]; env: Record<string, string> }

async function claudeEntry(): Promise<Entry> {
  return JSON.parse(await readFile(join(home, ".claude.json"), "utf8")).mcpServers.pipeshub;
}

async function codexEntry(): Promise<Entry> {
  const toml = await readFile(join(home, ".codex", "config.toml"), "utf8");
  const section = toml.match(/\[mcp_servers\.pipeshub\]\n([\s\S]*?)(?=\n\[(?!mcp_servers\.pipeshub\.env)|$)/)?.[1] ?? "";
  const envBlock = toml.match(/\[mcp_servers\.pipeshub\.env\]\n([\s\S]*?)(?=\n\[|\n# <<<|$)/)?.[1] ?? "";
  return {
    command: JSON.parse(section.match(/^command = (".*")$/m)![1]!),
    args: JSON.parse(section.match(/^args = (\[.*\])$/m)![1]!),
    env: Object.fromEntries([...envBlock.matchAll(/^(\w+) = (".*")$/gm)].map((m) => [m[1]!, JSON.parse(m[2]!)])),
  };
}

/** Spawn the bridge exactly as the agent's config says; only `npx -y @pipeshub-ai/mcp@...` (not published yet) is this checkout's build. */
async function bridge(entry: Entry): Promise<Client> {
  expect(entry.command).toBe("npx");
  expect(entry.args.slice(0, 2)).toEqual(["-y", "@pipeshub-ai/mcp@>=4.8.0"]);
  const t = new StdioClientTransport({ command: "node", args: [BRIDGE, ...entry.args.slice(2)], env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: home, ...entry.env }, stderr: "pipe" });
  const c = new Client({ name: "golden", version: "0" });
  await c.connect(t);
  return c;
}

const toolNames = async (c: Client) => (await c.listTools()).tools.map((t) => t.name);
const text = (r: unknown) => ((r as { content: { text: string }[] }).content ?? []).map((x) => x.text).join("");

async function neighbours(c: Client, file: string, symbol: string, direction: "inbound" | "outbound"): Promise<string[]> {
  const r = await c.callTool({ name: "pipeshub_code_neighbours", arguments: { repo: "repo", file_path: file, qualified_name: symbol, direction, edge_types: ["CALLS"] } });
  expect((r as { isError?: boolean }).isError).toBeFalsy();
  return (JSON.parse(text(r)).neighbors as { file_path: string; qualified_name: string }[]).map((n) => `${n.file_path}#${n.qualified_name}`).sort();
}

const git = (...a: string[]) => {
  const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: repo, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};

describe.skipIf(!RUN)("L9 golden path: npx init -> npx index -> ask the agent", () => {
  beforeAll(async () => {
    base = await mkdtemp(join(tmpdir(), "l9i-golden-"));
    home = join(base, "home");
    repo = join(base, "repo");
    for (const [rel, body] of Object.entries(seeded)) {
      await mkdir(join(home, rel, ".."), { recursive: true });
      await writeFile(join(home, rel), body);
    }
    await mkdir(join(home, ".claude"), { recursive: true }); // a fake Claude Code install
    for (const [rel, body] of Object.entries(FIXTURE)) {
      await mkdir(join(repo, rel, ".."), { recursive: true });
      await writeFile(join(repo, rel), body);
    }
    git("init", "-q");
    git("add", "-A");
    git("commit", "-qm", "init");
    before = new Map(await Promise.all((await walk(home)).map(async (f) => [f, await readFile(f, "utf8")] as const)));
    const pack = spawnSync("npm", ["pack", "./standalone", "--pack-destination", base, "--silent"], { cwd: ROOT, encoding: "utf8" });
    expect(pack.status).toBe(0);
    tarball = join(base, pack.stdout.trim().split("\n").pop()!);
  }, 120_000);

  afterAll(async () => {
    if (home) await npx(["dev", "down", "--volumes"], base, 300_000).catch(() => undefined);
    if (process.env["GOLDEN_REPORT"]) await writeFile(process.env["GOLDEN_REPORT"], JSON.stringify(report, null, 2) + "\n");
    console.log(`[l9i-golden] ${JSON.stringify(report)}`);
    if (base) await rm(base, { recursive: true, force: true });
  }, 400_000);

  test("the one command, npx init --yes in the repository: starts the stack, signs in with the device grant, writes Claude Code and Codex without touching the person's other entries, and indexes the repository", async () => {
    t0 = Date.now();
    const r = await npx(["init", "--yes", "--port", PORT], repo);
    report["init_s"] = Math.round((Date.now() - t0) / 100) / 10;
    if (r.code !== 0) throw new Error(`npx init exited ${r.code}\n--- stderr ---\n${r.stderr.slice(-3000)}\n--- stdout ---\n${r.stdout.slice(-1500)}`);  // a failure must say why
    expect(r.stdout).toContain("started the local stack");
    expect(r.stdout).toContain("created the first account");
    // the repository init was run in is indexed by the same command
    expect(r.stdout).toMatch(/^Code: +repo: 9 files, ready$/m);
    // run through npx, the hints must be typeable
    expect(r.stdout).toContain("npx @pipeshub-ai/standalone uninstall");
    const claude = JSON.parse(await readFile(join(home, ".claude.json"), "utf8"));
    expect(claude.numStartups).toBe(7);
    expect(claude.mcpServers.other).toEqual({ command: "echo", args: ["hi"] });
    expect(Object.keys(claude.mcpServers)).toEqual(["other", "pipeshub"]);
    expect(await readFile(join(home, ".codex", "config.toml"), "utf8")).toContain("[mcp_servers.other]");
    const creds = JSON.parse(await readFile(join(home, ".config/pipeshub/credentials.json"), "utf8"));
    expect(creds.refreshToken).toBeTruthy();
    // not a counted command: the same CLI read directly
    const st = Bun.spawn(["node", join(ROOT, "standalone", "bin", "pipeshub.js"), "auth", "status"], { env: env(), stdout: "pipe", stderr: "pipe" });
    expect(JSON.parse(await new Response(st.stdout).text()).scopes).toEqual(expect.arrayContaining(["code:write", "kb:write", "code:read"]));
  }, 900_000);

  test("ask: through the Claude Code bridge the 9 code tools and index_workspace are listed; callers and callees are right in four languages", async () => {
    const c = await bridge(await claudeEntry());
    try {
      const names = await toolNames(c);
      expect(names.filter((n) => n.startsWith("pipeshub_code_"))).toHaveLength(9);
      expect(names).toContain("index_workspace");
      report["commands"] = npxCalls; // init; the question is asked to the agent, not typed as a command
      expect(report["commands"]).toBe(1);
      let first = true;
      for (const [lang, [cf, cq, rf, rq]] of Object.entries(PAIRS)) {
        expect(await neighbours(c, cf, cq, "inbound"), `what calls ${cq} (${lang})`).toEqual([`${rf}#${rq}`]);
        if (first) { report["first_answer_s"] = Math.round((Date.now() - t0) / 100) / 10; first = false; }
        expect(await neighbours(c, rf, rq, "outbound"), `what does ${rq} call (${lang})`).toEqual([`${cf}#${cq}`]);
      }
    } finally {
      await c.close();
    }
  }, 120_000);

  test("through the Codex bridge (its own config) the same tools answer, and a search returns a cited hit", async () => {
    const c = await bridge(await codexEntry());
    try {
      expect((await toolNames(c)).filter((n) => n.startsWith("pipeshub_code_"))).toHaveLength(9);
      const [cf, cq, rf, rq] = PAIRS["python"]!;
      expect(await neighbours(c, rf, rq, "outbound")).toEqual([`${cf}#${cq}`]);
      const hits = JSON.parse(text(await c.callTool({ name: "pipeshub_search", arguments: { query: "function target helper", limit: 5 } }))).records as
        { recordId: string; recordName: string; webUrl: string; passages: { text: string }[] }[];
      const hit = hits.find((h) => h.recordName === "b.py");
      expect(hit, JSON.stringify(hits.map((h) => h.recordName))).toBeDefined();
      expect(hit!.recordId).toMatch(/[0-9a-f-]{20,}/);
      expect(hit!.webUrl).toBe(`http://127.0.0.1:${PORT}/record/${hit!.recordId}`); // a link that opens, never the repository key
      expect(JSON.stringify(hits)).not.toContain("local-repo://");
      expect(hit!.passages.map((p) => p.text).join("")).toContain("helper(x)");
    } finally {
      await c.close();
    }
  }, 120_000);

  test("incremental re-index after an edit, an added file and a deleted file takes under 10 s, and the answers follow", async () => {
    await writeFile(join(repo, "pkg/b.py"), FIXTURE["pkg/b.py"] + "\n\ndef newcomer(x):\n    return target(x)\n");
    await writeFile(join(repo, "pkg/c.py"), "from pkg.b import newcomer\n\n\ndef second_caller():\n    return newcomer(2)\n");
    await rm(join(repo, "shop/a.go"));
    const t = Date.now();
    const r = await npx(["index", "."], repo, 120_000);
    report["incremental_s"] = Math.round((Date.now() - t) / 100) / 10;
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ state: "ready", sent: 2 });
    expect(Number(report["incremental_s"])).toBeLessThan(10);

    const c = await bridge(await claudeEntry());
    try {
      expect(await neighbours(c, "pkg/b.py", "function:target", "inbound")).toEqual(["pkg/a.py#function:caller", "pkg/b.py#function:newcomer"]);
      expect(await neighbours(c, "pkg/b.py", "function:newcomer", "inbound")).toEqual(["pkg/c.py#function:second_caller"]);
      expect(await neighbours(c, "shop/b.go", "function:Target", "inbound")).toEqual([]);
      // the same through the agent's own tool: one more edit, indexed by index_workspace
      await writeFile(join(repo, "src/c.ts"), "import { caller } from './a';\nexport function top(): number {\n  return caller();\n}\n");
      const ix = JSON.parse(text(await c.callTool({ name: "index_workspace", arguments: { path: repo, waitSeconds: 60 } })));
      expect(ix.folders[0]).toMatchObject({ ok: true, state: "ready", sent: 1, codeTools: true });
      expect(await neighbours(c, "src/a.ts", "function:caller", "inbound")).toEqual(["src/c.ts#function:top"]);
    } finally {
      await c.close();
    }
  }, 300_000);

  test("no secret is in any file the person owns: not the token, not the generated password", async () => {
    const creds = JSON.parse(await readFile(join(home, ".config/pipeshub/credentials.json"), "utf8"));
    const account = JSON.parse(await readFile(join(home, ".config/pipeshub/local-account.json"), "utf8"));
    let scanned = 0;
    for (const f of [...(await walk(home, (p) => !mine(p))), ...(await walk(repo, (p) => p.endsWith("/.git")))]) {
      const body = await readFile(f, "utf8");
      scanned++;
      for (const secret of [creds.accessToken, creds.refreshToken, account.password]) expect(secret && body.includes(secret), f).toBeFalsy();
      expect(body, f).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    }
    report["files_scanned"] = scanned;
    expect(scanned).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(creds)).toContain(creds.accessToken); // the scan can see a token where one is
  });

  test("npx init --uninstall leaves every agent file byte for byte as it was, and removes the ones init added", async () => {
    const r = await npx(["init", "--uninstall"], repo, 300_000);
    expect(r.code).toBe(0);
    const after = new Map(await Promise.all((await walk(home, (p) => !mine(p))).map(async (f) => [f, await readFile(f, "utf8")] as const)));
    expect([...after.keys()]).toEqual([...before.keys()]);
    for (const [f, body] of before) expect(after.get(f), f).toBe(body);
    report["uninstall_identical"] = true;
  }, 300_000);
});
