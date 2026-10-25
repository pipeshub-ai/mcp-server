import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListRootsRequestSchema, ToolListChangedNotificationSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createBridge } from "../src/cli/bridge.js";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// The stdio bridge as a proxy of the server's /mcp: the agent sees the server's
// tools (minus chat when it is off) plus the local index_workspace, calls pass
// through with the stored sign-in, and a server that is down is a clear error.

const tool = (name: string): Tool => ({
  name,
  description: `The ${name} tool.`,
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
});
const CODE = ["repos", "symbols", "neighbours", "read", "path", "search", "outline", "impact", "entry_points"].map((n) => `pipeshub_code_${n}`);
const SERVER_TOOLS = ["pipeshub_sources", "pipeshub_search", "pipeshub_get_record_content", "pipeshub_chat", "pipeshub_agents", ...CODE, "pipeshub_broken"].map(tool);

let root: string;
let fake: FakeLocal;
let token = "";
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "l9b-"));
  // The temp dir may sit inside a checkout; a plain folder must not resolve to it.
  process.env["GIT_CEILING_DIRECTORIES"] = root;
});
afterAll(async () => {
  delete process.env["GIT_CEILING_DIRECTORIES"];
  await rm(root, { recursive: true, force: true });
});
beforeEach(() => {
  fake = startFakeLocal({ orgExists: true });
  fake.mcp.tools = SERVER_TOOLS as unknown as Record<string, unknown>[];
  token = fake.issuedToken;
});
afterEach(() => fake.stop());

async function connect(opts: { chat?: boolean; roots?: string[] | null; timeoutMs?: number; origin?: string; onListChanged?: () => void } = {}) {
  const bridge = createBridge({ auth: { origin: opts.origin ?? fake.origin, token: async () => token }, chat: opts.chat ?? false, ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}) });
  const client = new Client({ name: "t", version: "0" }, { capabilities: opts.roots ? { roots: {} } : {} });
  if (opts.onListChanged) client.setNotificationHandler(ToolListChangedNotificationSchema, opts.onListChanged);
  if (opts.roots) client.setRequestHandler(ListRootsRequestSchema, async () => ({ roots: opts.roots!.map((p) => ({ uri: pathToFileURL(p).href })) }));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([bridge.connect(a), client.connect(b)]);
  return client;
}

const git = (cwd: string, ...a: string[]) => {
  const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};
async function repo(name: string): Promise<string> {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "a.py"), "def a():\n    return 1\n");
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "x");
  return dir;
}
const jsonOf = (r: { content?: unknown }) => JSON.parse(((r.content as { text: string }[])[0])!.text);

describe("tools/list", () => {
  test("is the server's list minus chat and agents, unchanged, plus index_workspace", async () => {
    const c = await connect({ chat: false });
    const names = (await c.listTools()).tools.map((t) => t.name);
    expect(names.filter((n) => n !== "index_workspace")).toEqual(SERVER_TOOLS.map((t) => t.name).filter((n) => n !== "pipeshub_chat" && n !== "pipeshub_agents"));
    expect(names).toContain("index_workspace");
    expect(names.filter((n) => n.startsWith("pipeshub_code_"))).toHaveLength(9);
    // definitions pass through untouched
    const search = (await c.listTools()).tools.find((t) => t.name === "pipeshub_search")!;
    expect(search.description).toBe("The pipeshub_search tool.");
    expect(search.inputSchema).toEqual(SERVER_TOOLS[1]!.inputSchema);
  });

  test("with chat on it is the whole server list plus index_workspace", async () => {
    const c = await connect({ chat: true });
    expect((await c.listTools()).tools.map((t) => t.name)).toEqual([...SERVER_TOOLS.map((t) => t.name), "index_workspace"]);
  });

  test("a tool the server adds later appears with no change here", async () => {
    const c = await connect();
    fake.mcp.tools = [...SERVER_TOOLS, tool("pipeshub_new_thing")] as unknown as Record<string, unknown>[];
    expect((await c.listTools()).tools.map((t) => t.name)).toContain("pipeshub_new_thing");
  });

  test("the instructions tell the model about index_workspace and never name chat when it is off", async () => {
    const c = await connect({ chat: false });
    const text = c.getInstructions() ?? "";
    expect(text).toContain("index_workspace");
    expect(text).not.toContain("pipeshub_chat");
  });
});

describe("tools/call", () => {
  test("is a round trip: the name, the arguments and the current sign-in reach the server; the result comes back as is", async () => {
    const c = await connect();
    const r = await c.callTool({ name: "pipeshub_code_impact", arguments: { symbol: "createSession" } });
    expect(jsonOf(r)).toEqual({ tool: "pipeshub_code_impact", args: { symbol: "createSession" } });
    expect(fake.mcp.calls).toEqual([{ name: "pipeshub_code_impact", args: { symbol: "createSession" }, authorization: `Bearer ${token}` }]);
    // a refreshed sign-in is used on the next call
    token = "refreshed-token";
    await c.callTool({ name: "pipeshub_search", arguments: { query: "x" } });
    expect(fake.mcp.calls.at(-1)!.authorization).toBe("Bearer refreshed-token");
  });

  test("a tool error from the server is passed on as a tool error with its text", async () => {
    const c = await connect();
    const r = await c.callTool({ name: "pipeshub_broken", arguments: {} });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("HTTP 403");
  });

  test("chat is refused locally when off and never reaches the server", async () => {
    const c = await connect({ chat: false });
    const r = await c.callTool({ name: "pipeshub_chat", arguments: { query: "hi" } });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("PIPESHUB_MCP_CHAT=off");
    expect(fake.mcp.calls).toEqual([]);
    expect((await (await connect({ chat: true })).callTool({ name: "pipeshub_chat", arguments: {} })).isError).toBeFalsy();
  });
});

describe("index_workspace", () => {
  test("indexes every open folder the client shares, reports progress and status, and a second call sends nothing", async () => {
    const a = await repo("ws-a");
    const b = await repo("ws-b");
    const c = await connect({ roots: [a, b] });
    const progress: string[] = [];
    const r = await c.callTool({ name: "index_workspace", arguments: { waitSeconds: 0 } }, undefined, {
      onprogress: (p) => progress.push(p.message ?? ""),
    });
    expect(r.isError).toBeFalsy();
    const out = jsonOf(r);
    expect(out.folders.map((f: { folder: string; ok: boolean }) => [f.folder, f.ok])).toEqual([[a, true], [b, true]]);
    expect(out.folders[0]).toMatchObject({ repo: "ws-a", files: 1, sent: 1 });
    expect(["ready", "syncing", "indexing", "empty"]).toContain(out.folders[0].state);
    expect(fake.repo.commits).toBe(2);
    expect(progress.some((m) => m.includes("Indexing"))).toBe(true);
    const again = jsonOf(await c.callTool({ name: "index_workspace", arguments: { waitSeconds: 0 } }));
    expect(again.folders[0].sent).toBe(0);
  });

  test("without roots and without a path it says what to do, and sends nothing", async () => {
    const c = await connect({ roots: null });
    const r = await c.callTool({ name: "index_workspace", arguments: {} });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toMatch(/did not share its open folders[\s\S]*path/);
    expect(fake.log.some((l) => l.includes("local-repos"))).toBe(false);
  });

  test("without roots, an explicit path is indexed", async () => {
    const dir = await repo("ws-explicit");
    const c = await connect({ roots: null });
    const r = await c.callTool({ name: "index_workspace", arguments: { path: dir, waitSeconds: 0 } });
    expect(jsonOf(r).folders[0]).toMatchObject({ ok: true, repo: "ws-explicit" });
  });

  test("waits for the code tools and then tells the client the tool list changed", async () => {
    const dir = await repo("ws-tools");
    fake.mcp.tools = SERVER_TOOLS.filter((t) => !t.name.startsWith("pipeshub_code_")) as unknown as Record<string, unknown>[];
    setTimeout(() => { fake.mcp.tools = SERVER_TOOLS as unknown as Record<string, unknown>[]; }, 2000);
    let changed = 0;
    const c = await connect({ roots: [dir], onListChanged: () => { changed++; } });
    expect((await c.listTools()).tools.some((t) => t.name.startsWith("pipeshub_code_"))).toBe(false);
    const r = await c.callTool({ name: "index_workspace", arguments: { waitSeconds: 0 } });
    expect(jsonOf(r).folders[0]).toMatchObject({ ok: true, codeTools: true });
    await new Promise((res) => setTimeout(res, 200));
    expect(changed).toBe(1);
    expect((await c.listTools()).tools.some((t) => t.name.startsWith("pipeshub_code_"))).toBe(true);
  });

  test("a folder that cannot be indexed is reported per folder; the others still run", async () => {
    const good = await repo("ws-good");
    const plain = join(root, "not-a-repo");
    await mkdir(plain, { recursive: true });
    const missing = join(root, "gone");
    const c = await connect({ roots: [plain, good, missing] });
    const r = await c.callTool({ name: "index_workspace", arguments: { waitSeconds: 0 } });
    expect(r.isError).toBeFalsy();
    const [p, g, m] = jsonOf(r).folders;
    expect(p).toMatchObject({ ok: false });
    expect(p.error).toContain("git");
    expect(g).toMatchObject({ ok: true });
    expect(m.ok).toBe(false);
  });

  test("when nothing can be indexed the call is an error", async () => {
    const plain = join(root, "only-plain");
    await mkdir(plain, { recursive: true });
    const c = await connect({ roots: [plain] });
    const r = await c.callTool({ name: "index_workspace", arguments: {} });
    expect(r.isError).toBe(true);
    expect(jsonOf(r).folders[0].ok).toBe(false);
  });

  test("a server that refuses the sign-in is reported, not hidden", async () => {
    const dir = await repo("ws-denied");
    token = "wrong-token";
    const c = await connect({ roots: [dir] });
    const r = await c.callTool({ name: "index_workspace", arguments: { waitSeconds: 0 } });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("not signed in");
  });
});

describe("when PipesHub is down", () => {
  async function deadOrigin() {
    const gone = startFakeLocal();
    const o = gone.origin;
    gone.stop();
    return o;
  }

  test("tools/list is a clear error, fast", async () => {
    const c = await connect({ origin: await deadOrigin() });
    const t = Date.now();
    await expect(c.listTools()).rejects.toThrow(/could not reach/);
    expect(Date.now() - t).toBeLessThan(5000);
  });

  test("tools/call is a tool error that says how to start it, fast", async () => {
    const c = await connect({ origin: await deadOrigin() });
    const t = Date.now();
    const r = await c.callTool({ name: "pipeshub_search", arguments: { query: "x" } });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("could not reach");
    expect(Date.now() - t).toBeLessThan(5000);
  });

  test("a server that accepts and never answers times out instead of hanging", async () => {
    fake.mcp.hang = true;
    const c = await connect({ timeoutMs: 400 });
    const t = Date.now();
    await expect(c.listTools()).rejects.toThrow(/timed out/);
    const r = await c.callTool({ name: "pipeshub_search", arguments: {} });
    expect(r.isError).toBe(true);
    expect(Date.now() - t).toBeLessThan(5000);
  });

  test("index_workspace says the server is down for each folder", async () => {
    const dir = await repo("ws-down");
    const c = await connect({ roots: [dir], origin: await deadOrigin() });
    const r = await c.callTool({ name: "index_workspace", arguments: {} });
    expect(r.isError).toBe(true);
    expect(jsonOf(r).folders[0].error).toBeTruthy();
  });
});

describe("`start` over stdio", () => {
  const ENTRY = join(import.meta.dir, "..", "src", "mcp-server", "mcp-server.ts");

  async function stdio(home: string, env: Record<string, string> = {}) {
    await mkdir(join(home, ".config", "pipeshub"), { recursive: true });
    await writeFile(join(home, ".config", "pipeshub", "credentials.json"), JSON.stringify({
      origin: fake.origin, clientId: "c", tokenEndpoint: fake.origin + "/t", accessToken: fake.issuedToken, expiresAt: Date.now() + 3_600_000,
    }), { mode: 0o600 });
    const t = new StdioClientTransport({
      command: process.execPath,
      args: [ENTRY, "start", "--server-url", fake.origin],
      env: { PATH: "/usr/bin:/bin", HOME: home, PIPESHUB_MCP_CHAT: "off", ...env },
      stderr: "pipe",
    });
    const c = new Client({ name: "t", version: "0" });
    await c.connect(t);
    return c;
  }

  test("with the entry init writes, the agent gets the server's tools through the stored sign-in", async () => {
    const home = join(root, "stdio-home");
    const c = await stdio(home);
    try {
      const names = (await c.listTools()).tools.map((t) => t.name);
      expect(names).toContain("pipeshub_code_impact");
      expect(names).toContain("index_workspace");
      expect(names).not.toContain("pipeshub_chat");
      const r = await c.callTool({ name: "pipeshub_search", arguments: { query: "q" } });
      expect(jsonOf(r).tool).toBe("pipeshub_search");
      expect(fake.mcp.calls[0]!.authorization).toBe(`Bearer ${fake.issuedToken}`);
    } finally {
      await c.close();
    }
  }, 30_000);

  test("an instance with no /mcp (404) falls back to the per-tool server", async () => {
    fake.mcp.status = 404;
    const c = await stdio(join(root, "stdio-home-old"));
    try {
      const names = (await c.listTools()).tools.map((t) => t.name);
      expect(names).toContain("pipeshub_search");
      expect(names).not.toContain("index_workspace");
    } finally {
      await c.close();
    }
  }, 30_000);
});
