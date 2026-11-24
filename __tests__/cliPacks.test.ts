import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CliError } from "../src/cli/config.js";
import { humanSize, packsAdd, packsEmbedding, packsList, packsRemove, type PacksOpts } from "../src/cli/packs.js";
import type { Ctx } from "../src/cli/commands.js";

// `pipeshub packs` against a stub of the packs API (documented in the PipesHub API reference).
// The command functions run in-process with a fast poll; a few cases run the real binary for wiring and exit codes.

const TOKEN = "fake-packs-token-0000";
const pack = (o: Record<string, unknown>) => ({
  id: "playwright", name: "Web browser", kind: "playwright", size: 201270760, state: "not_installed", percent: 0, error: null, ...o,
});
const embed = (o: Record<string, unknown>) => pack({
  id: "embedding-bge-base-en-v1.5", name: "BGE base", kind: "embedding", size: 1_300_000_000, model: "BAAI/bge-base-en-v1.5", active: false, ...o,
});

interface Call { method: string; path: string; body: unknown; auth: string | null }
let calls: Call[];
let packs: Record<string, unknown>[];
let installReply: { status: number; body: unknown };
let onList: () => void; // advances the stub's state on each GET /packs
let sw: Record<string, unknown> | null;
let switchReply: { status: number; body: unknown } | null;

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const text = await req.text();
    calls.push({ method: req.method, path: url.pathname, body: text ? JSON.parse(text) : undefined, auth: req.headers.get("authorization") });
    const json = (status: number, body: unknown) => Response.json(body, { status });
    if (url.pathname === "/api/v1/packs" && req.method === "GET") {
      onList();
      return json(200, { platform: "linux-x86_64", packs, embedding: { default: "BAAI/bge-small-en-v1.5", active: "BAAI/bge-small-en-v1.5", switch: sw } });
    }
    if (url.pathname === "/api/v1/packs/embedding/switch") {
      if (req.method === "GET") { onList(); return json(200, { switch: sw }); }
      return switchReply ? json(switchReply.status, switchReply.body) : json(202, { switch: sw });
    }
    if (url.pathname.endsWith("/install")) return json(installReply.status, installReply.body);
    if (req.method === "DELETE") return json(200, { pack: { ...packs[0], state: "not_installed" } });
    return json(404, { error: { message: "nope" } });
  },
});
afterAll(() => server.stop(true));

const ctx = (origin = `http://127.0.0.1:${server.port}`): Ctx => ({ origin, token: TOKEN, insecureHttp: false, requestId: "r", json: false, maxChars: 2000 });
let said: string[];
let confirmed: string[];
const opts = (o: Partial<PacksOpts> = {}): PacksOpts => ({ say: (l) => said.push(l), confirm: async (q) => { confirmed.push(q); return true; }, wait: true, pollMs: 5, ...o });
const failure = async (p: Promise<unknown>): Promise<CliError> => {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(CliError);
  return e as CliError;
};

beforeEach(() => {
  calls = [];
  said = [];
  confirmed = [];
  packs = [pack({}), embed({})];
  installReply = { status: 202, body: { pack: pack({ state: "downloading" }) } };
  onList = () => {};
  sw = null;
  switchReply = null;
});

describe("packs list", () => {
  test("a table with human sizes, percent while active, and the embedding model in use", async () => {
    packs = [pack({ state: "downloading", percent: 42 }), embed({ state: "installed", active: true }), pack({ id: "libreoffice", name: "Documents", size: 5_000_000, state: "installed" })];
    const out = await packsList(ctx());
    const lines = out.text!.split("\n");
    expect(lines[0]).toMatch(/^ID\s+NAME\s+SIZE\s+STATE\s+IN USE$/);
    expect(lines[1]).toMatch(/^playwright\s+Web browser\s+201 MB\s+downloading 42%$/);
    expect(lines[2]).toMatch(/^embedding-bge-base-en-v1\.5\s+BGE base\s+1\.3 GB\s+installed\s+yes$/);
    expect(lines[3]).toMatch(/Documents\s+5 MB\s+installed$/);
    expect(out.payload["packs"]).toHaveLength(3); // --json is the API answer
    expect(calls[0]!.auth).toBe(`Bearer ${TOKEN}`);
  });

  test("humanSize", () => {
    expect([humanSize(201_270_760), humanSize(1_300_000_000), humanSize(10)]).toEqual(["201 MB", "1.3 GB", "1 MB"]);
  });
});

describe("packs add", () => {
  test("polls the progress to installed", async () => {
    let n = 0;
    onList = () => { // the first GET is the id check
      n++;
      packs = [pack(n < 3 ? { state: "downloading", percent: 10, bytes: 20_000_000 } : n < 4 ? { state: "extracting", percent: 90, bytes: 200_000_000 } : { state: "installed", percent: 100 })];
    };
    const out = await packsAdd(ctx(), "playwright", null, false, opts());
    expect(said).toEqual(["Web browser: downloading 10% (20.0 MB of 201 MB)", "Web browser: extracting 90% (200.0 MB of 201 MB)"]);
    expect(out.exit).toBe(0);
    expect(out.text).toBe("Web browser is installed.");
    expect(calls.find((c) => c.path.endsWith("/install"))!.body).toEqual({});
  });

  test("--no-wait returns at once", async () => {
    const out = await packsAdd(ctx(), "playwright", null, false, opts({ wait: false }));
    expect(out.text).toContain("Installing Web browser");
    expect(calls.filter((c) => c.method === "GET")).toHaveLength(1); // the id check only
  });

  test("a failed install exits 1 with the server's text", async () => {
    onList = () => { packs = [pack({ state: "failed", error: "checksum mismatch" })]; };
    const e = await failure(packsAdd(ctx(), "playwright", null, false, opts()));
    expect(e.code).toBe(1);
    expect(e.message).toBe("Web browser failed: checksum mismatch");
  });

  test("an interrupted install says how to continue", async () => {
    onList = () => { packs = [pack({ state: "interrupted", error: "connection lost" })]; };
    const e = await failure(packsAdd(ctx(), "playwright", null, false, opts()));
    expect(e.code).toBe(1);
    expect(e.message).toContain("interrupted: connection lost");
    expect(e.message).toContain("pipeshub packs add playwright");
  });

  test("--file is sent to the server", async () => {
    await packsAdd(ctx(), "playwright", "/srv/packs/pw.tar.gz", false, opts({ wait: false }));
    expect(calls.find((c) => c.path.endsWith("/install"))!.body).toEqual({ file: "/srv/packs/pw.tar.gz" });
  });

  test("an unknown id lists the valid ones, before any install call", async () => {
    const e = await failure(packsAdd(ctx(), "nope", null, false, opts()));
    expect(e.code).toBe(2);
    expect(e.message).toBe("unknown pack: nope. Packs: playwright, embedding-bge-base-en-v1.5");
    expect(calls.some((c) => c.path.endsWith("/install"))).toBe(false);
  });

  test("403, 409 and 507 print the server's one line", async () => {
    for (const [status, code, message] of [[403, 4, "Only an admin can install packs."], [409, 1, "Web browser is already installing."], [507, 1, "Not enough disk space (need 554 MB)."]] as const) {
      installReply = { status, body: { error: { message } } };
      const e = await failure(packsAdd(ctx(), "playwright", null, false, opts()));
      expect([e.code, e.message]).toEqual([code, message]);
    }
  });

  test("FastAPI detail text is read too", async () => {
    installReply = { status: 409, body: { detail: "already installing" } };
    expect((await failure(packsAdd(ctx(), "playwright", null, false, opts()))).message).toBe("already installing");
  });

  test("--use switches the embedding model after install and follows it to done", async () => {
    packs = [embed({ state: "installed" })];
    let n = 0;
    onList = () => { n++; sw = { state: n < 3 ? "building" : "done", model: "BAAI/bge-base-en-v1.5", percent: n < 3 ? 40 : 100, done: 4, total: 10 }; };
    sw = { state: "starting", model: "BAAI/bge-base-en-v1.5", percent: 0 };
    const out = await packsAdd(ctx(), "embedding-bge-base-en-v1.5", null, true, opts());
    expect(calls.find((c) => c.method === "POST" && c.path.endsWith("/switch"))!.body).toEqual({ model: "BAAI/bge-base-en-v1.5" });
    expect(calls.some((c) => c.path.endsWith("/install"))).toBe(false); // already installed
    expect(said.some((l) => l.startsWith("Switching embedding model: building 40% (4 of 10)"))).toBe(true);
    expect(out.text).toContain("Search now uses BAAI/bge-base-en-v1.5.");
  });

  test("--use needs an embedding pack and --wait", async () => {
    expect((await failure(packsAdd(ctx(), "playwright", null, true, opts()))).code).toBe(2);
    expect((await failure(packsAdd(ctx(), "embedding-bge-base-en-v1.5", null, true, opts({ wait: false })))).code).toBe(2);
  });
});

describe("packs remove", () => {
  test("asks first and removes on yes", async () => {
    const out = await packsRemove(ctx(), "playwright", false, opts());
    expect(confirmed).toEqual(["Remove Web browser (201 MB)? [y/N] "]);
    expect(out.text).toBe("Web browser is removed.");
    expect(calls.some((c) => c.method === "DELETE")).toBe(true);
  });

  test("a no removes nothing", async () => {
    const e = await failure(packsRemove(ctx(), "playwright", false, opts({ confirm: async () => false })));
    expect(e.message).toBe("not removed.");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  test("--yes does not ask", async () => {
    await packsRemove(ctx(), "playwright", true, opts());
    expect(confirmed).toEqual([]);
    expect(calls.some((c) => c.method === "DELETE")).toBe(true);
  });
});

describe("packs embedding", () => {
  test("shows the model in use", async () => {
    const out = await packsEmbedding(ctx(), null, false, opts());
    expect(out.text).toContain("Search uses BAAI/bge-small-en-v1.5");
  });

  test("--builtin posts a null model; a pack id maps to its model", async () => {
    sw = { state: "done", model: "x" };
    await packsEmbedding(ctx(), null, true, opts({ wait: false }));
    await packsEmbedding(ctx(), "embedding-bge-base-en-v1.5", false, opts({ wait: false }));
    const posts = calls.filter((c) => c.method === "POST").map((c) => c.body);
    expect(posts).toEqual([{ model: null }, { model: "BAAI/bge-base-en-v1.5" }]);
  });

  test("a switch the server refuses prints its message", async () => {
    switchReply = { status: 409, body: { error: { message: "Install the BGE base pack (1.3 GB) first." } } };
    expect((await failure(packsEmbedding(ctx(), "BAAI/bge-base-en-v1.5", false, opts()))).message).toBe("Install the BGE base pack (1.3 GB) first.");
  });

  test("a failed switch exits 1 with the server's text", async () => {
    sw = { state: "failed", model: "m", error: "out of memory" };
    const e = await failure(packsEmbedding(ctx(), "m", false, opts()));
    expect([e.code, e.message]).toEqual([1, "switching to m failed: out of memory"]);
  });
});

describe("errors", () => {
  test("PipesHub not reachable names the address", async () => {
    const e = await failure(packsList(ctx("http://127.0.0.1:9")));
    expect(e.message).toContain("PipesHub is not reachable at http://127.0.0.1:9");
  });

  test("403 without a message still says why", async () => {
    installReply = { status: 403, body: {} };
    expect((await failure(packsAdd(ctx(), "playwright", null, false, opts()))).message).toBe("only an admin can change packs.");
  });
});

// The real binary: argument wiring, stdout/stderr split, exit codes.
const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    env: { PATH: process.env["PATH"] ?? "", HOME: "/nonexistent", PIPESHUB_TOKEN: TOKEN, PIPESHUB_BASE_URL: `http://127.0.0.1:${server.port}` },
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  expect(stdout + stderr).not.toContain(TOKEN);
  return { code, stdout, stderr };
}

describe("the pipeshub binary", () => {
  test("packs ls prints the table; --json prints the API answer", async () => {
    const t = await cli(["packs", "ls"]);
    expect(t.code).toBe(0);
    expect(t.stdout).toContain("playwright");
    const j = await cli(["packs", "list", "--json"]);
    expect(JSON.parse(j.stdout).platform).toBe("linux-x86_64");
  });

  test("a failed install exits 1 and prints one line, no stack", async () => {
    onList = () => { packs = [pack({ state: "failed", error: "disk error" })]; };
    const r = await cli(["packs", "add", "playwright", "--wait"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toBe("pipeshub: Web browser failed: disk error\n");
  });

  test("a 403 exits 4; an unknown id exits 2; remove without --yes does not prompt off a terminal", async () => {
    installReply = { status: 403, body: { error: { message: "Admins only." } } };
    const a = await cli(["packs", "add", "playwright", "--no-wait"]);
    expect([a.code, a.stderr]).toEqual([4, "pipeshub: Admins only.\n"]);
    expect((await cli(["packs", "add", "nope"])).code).toBe(2);
    expect((await cli(["packs", "rm", "playwright"])).code).toBe(0);
    expect((await cli(["packs", "frob"])).code).toBe(2);
  });
});
