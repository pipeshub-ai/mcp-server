// `pipeshub index [path] [--watch]`: push the working tree of a git repository
// into the local PipesHub's code graph, through the local-repos API
// (notes handoffs/L9-C-api.md): register, send a manifest of hashes, upload
// only what the server lacks, commit, and wait until it is indexed.
//
// shortcut: watch mode re-runs the whole pass on a debounced change (the hash
// cache keeps that cheap) instead of sending only the changed paths; upgrade
// when a repo is large enough for the full manifest to be slow.

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CliError, EXIT, assertTransport, resolveOrigin, resolveToken } from "../config.js";
import { postMcp } from "../client.js";
import { storedLogin } from "../login.js";

interface Limits { maxFiles: number; maxFileBytes: number; maxBatchFiles: number; maxBatchBytes: number; maxManifestEntries: number }
interface Status { state: string; files: number; error?: string; indexing?: Record<string, number> }
interface Entry { path: string; sha256: string; size: number; content: string }

const git = (cwd: string, args: string[]): string => {
  const r = spawnSync("git", args, { cwd, env: process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new CliError(`git ${args[0]} failed in ${cwd}: ${(r.stderr || r.error?.message || "").trim()}. Is this a git repository?`, EXIT.USAGE);
  return r.stdout;
};

async function identity(root: string): Promise<string> {
  const file = join(resolve(root, git(root, ["rev-parse", "--git-dir"]).trim()), "pipeshub-repo-id");
  const have = (await readFile(file, "utf8").catch(() => "")).trim();
  if (/^[A-Za-z0-9_-]{8,64}$/.test(have)) return have;
  const id = randomUUID().replaceAll("-", "");
  await writeFile(file, id + "\n");
  return id;
}

async function call(origin: string, token: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${origin}/api/v1/local-repos${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) throw new CliError("not signed in to this PipesHub. Run 'pipeshub init' or 'pipeshub login'.", EXIT.UNAUTHENTICATED);
  if (res.status === 403) throw new CliError("this sign-in cannot index repositories (needs the code:write scope). Run 'pipeshub login' again after updating PipesHub.", EXIT.FORBIDDEN);
  if (res.status === 404 && path === "") throw new CliError("this PipesHub has no local-repository API; update the local stack.", EXIT.ERROR);
  if (res.status >= 400) throw new CliError(`${method} ${path || "/"} failed: HTTP ${res.status} ${String(parsed["detail"] ?? "")}`.trim(), EXIT.ERROR);
  return { status: res.status, body: parsed };
}

/** The files to send: `git ls-files` (tracked + untracked, .gitignore respected), minus binary and oversize ones. */
async function collect(root: string, limits: Limits, cache: Map<string, { m: number; s: number; sha: string }>): Promise<{ entries: Entry[]; skipped: number }> {
  const names = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
  const entries: Entry[] = [];
  let skipped = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const path of names) {
    try {
      const st = await stat(join(root, path));
      if (!st.isFile() || st.size > limits.maxFileBytes) { skipped++; continue; }
      const bytes = await readFile(join(root, path));
      if (bytes.subarray(0, 4096).includes(0)) { skipped++; continue; }
      const content = decoder.decode(bytes);
      const hit = cache.get(path);
      const sha = hit && hit.m === st.mtimeMs && hit.s === st.size ? hit.sha : createHash("sha256").update(bytes).digest("hex");
      cache.set(path, { m: st.mtimeMs, s: st.size, sha });
      entries.push({ path: path.normalize("NFC"), sha256: sha, size: st.size, content });
    } catch {
      skipped++; // deleted since ls-files, unreadable, or not UTF-8
    }
  }
  return { entries, skipped };
}

export type HashCache = Map<string, { m: number; s: number; sha: string }>;

async function pass(origin: string, token: string, root: string, key: string, name: string, cache: Map<string, { m: number; s: number; sha: string }>, say: (s: string) => void, waitSeconds: number, startSeconds = START_SECONDS) {
  const reg = await call(origin, token, "PUT", `/${key}`, { name });
  const limits = reg.body["limits"] as Limits;
  const { entries, skipped } = await collect(root, limits, cache);
  if (entries.length > limits.maxManifestEntries) throw new CliError(`${entries.length} files is over this PipesHub's limit of ${limits.maxManifestEntries}.`, EXIT.USAGE);
  const m = (await call(origin, token, "POST", `/${key}/manifest`, {
    files: entries.map(({ path, sha256, size }) => ({ path, sha256, size })),
    complete: true,
  })).body;
  const want = new Set((m["upload"] as string[] | undefined) ?? []);
  const rejected = new Set(((m["rejected"] as { path: string }[] | undefined) ?? []).map((r) => r.path));
  const todo = entries.filter((e) => want.has(e.path) && !rejected.has(e.path));
  let batch: Entry[] = [];
  let bytes = 0;
  const flush = async () => {
    if (batch.length) await call(origin, token, "PUT", `/${key}/files`, { files: batch.map(({ path, sha256, content }) => ({ path, sha256, content })) });
    batch = [];
    bytes = 0;
  };
  for (const e of todo) {
    if (batch.length >= limits.maxBatchFiles || bytes + e.size > limits.maxBatchBytes) await flush();
    batch.push(e);
    bytes += Buffer.byteLength(e.content);
  }
  await flush();
  await call(origin, token, "POST", `/${key}/commit`);
  say(`Sent ${todo.length} changed of ${entries.length} files (${skipped} skipped: binary, large or unreadable).`);
  let status = (await call(origin, token, "GET", `/${key}`)).body as unknown as Status;
  const began = Date.now();
  for (let i = 0; i < Math.ceil(waitSeconds / 2); i++) {
    if (status.state === "stuck") throw new CliError(`${status.error ?? "the sync did not start"} Look at: docker compose -p pipeshub-slim logs pipeshub-slim`, EXIT.ERROR);
    if (["ready", "failed"].includes(status.state)) break;
    // "syncing" with no records yet means the server has not picked the commit up.
    if (status.state === "syncing" && Date.now() - began > startSeconds * 1000) {
      throw new CliError(`PipesHub stored the files but has not started syncing them after ${startSeconds} s. Run the command again; if it repeats, look at: docker compose -p pipeshub-slim logs pipeshub-slim`, EXIT.ERROR);
    }
    await new Promise((r) => setTimeout(r, 2000));
    status = (await call(origin, token, "GET", `/${key}`)).body as unknown as Status;
  }
  return { sent: todo.length, files: entries.length, skipped, state: status.state, indexing: status.indexing };
}

const START_SECONDS = 90;
const CODE_TOOLS_SECONDS = 15;
const caches = new Map<string, HashCache>();

/** True once the server lists a pipeshub_code_* tool for this sign-in (it can lag the first indexed repository by a few seconds). */
export async function waitForCodeTools(auth: { origin: string; token: string }, seconds: number): Promise<boolean> {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    try {
      const r = (await postMcp({ origin: auth.origin, token: auth.token, insecureHttp: false, requestId: "code-tools" }, { method: "tools/list" }, 10_000)) as { tools?: { name: string }[] };
      if ((r.tools ?? []).some((t) => t.name.startsWith("pipeshub_code_"))) return true;
    } catch { /* not answering: treated as not listed */ }
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/**
 * One full pass over the git repository holding `path` (the code behind both
 * `pipeshub index` and the bridge's `index_workspace`). Throws CliError when
 * the folder is missing or not a git repository, or the server refuses it.
 */
export async function indexRepo(
  path: string,
  auth: { origin: string; token: string },
  say: (s: string) => void,
  waitSeconds: number,
) {
  const root = git(resolve(path), ["rev-parse", "--show-toplevel"]).trim();
  assertTransport(auth.origin, false);
  const key = await identity(root);
  let cache = caches.get(root);
  if (!cache) caches.set(root, (cache = new Map()));
  const name = basename(root);
  const r = await pass(auth.origin, auth.token, root, key, name, cache, say, waitSeconds);
  const codeTools = r.state === "ready" ? await waitForCodeTools(auth, CODE_TOOLS_SECONDS) : false;
  return { repo: name, root, repoKey: key, ...r, codeTools };
}

export async function indexCommand(
  opts: { path: string; watch: boolean },
  env: NodeJS.ProcessEnv,
  say: (s: string) => void,
): Promise<{ exit: number; payload: Record<string, unknown> }> {
  const root = git(resolve(opts.path), ["rev-parse", "--show-toplevel"]).trim();
  let token = resolveToken(env);
  let origin = resolveOrigin(env);
  if (token === null) {
    const s = await storedLogin(origin, false, env);
    if (s) { token = s.accessToken; origin ??= s.origin; }
  }
  if (origin === null || token === null) throw new CliError("not signed in. Run 'pipeshub init' first.", EXIT.UNAUTHENTICATED);
  assertTransport(origin, false);
  const key = await identity(root);
  const name = basename(root);
  const cache = new Map<string, { m: number; s: number; sha: string }>();
  const wait = Number(env["PIPESHUB_INDEX_WAIT_SECONDS"] ?? 600);
  const first = await pass(origin, token, root, key, name, cache, say, wait, Number(env["PIPESHUB_INDEX_START_SECONDS"] ?? START_SECONDS));
  if (first.state !== "ready" && first.state !== "failed") {
    throw new CliError(`${name} is still ${first.state} after ${wait} s. The files are stored and PipesHub keeps going; run this again later to see it finish.`, EXIT.ERROR);
  }
  say(`${name}: ${first.state} (${first.files} files).`);
  const codeTools = first.state === "ready" ? await waitForCodeTools({ origin, token }, Number(env["PIPESHUB_INDEX_TOOLS_SECONDS"] ?? CODE_TOOLS_SECONDS)) : false;
  if (first.state === "ready") {
    say(codeTools
      ? "The code tools are available: ask your agent what calls a function."
      : "The code tools are not listed yet (PipesHub lists them a few seconds after the first repository is indexed). If your agent does not show them, restart it.");
  }
  if (!opts.watch) return { exit: first.state === "failed" ? EXIT.ERROR : EXIT.OK, payload: { repo: name, repoKey: key, ...first, codeTools } };

  say("Watching for changes (Ctrl-C to stop)...");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;
  const run = async () => {
    if (running) { again = true; return; }
    running = true;
    try {
      const r = await pass(origin!, token!, root, key, name, cache, say, 0);
      say(`${name}: sent ${r.sent}, ${r.state}.`);
    } catch (e) {
      say(`index failed: ${(e as Error).message}`);
    }
    running = false;
    if (again) { again = false; void run(); }
  };
  watch(root, { recursive: true }, (_ev, file) => {
    if (file && /^\.git([/\\]|$)/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 500);
  });
  await new Promise<never>(() => undefined);
  return { exit: EXIT.OK, payload: {} };
}
