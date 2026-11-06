// `pipeshub init` / `pipeshub uninstall`: find or start the local PipesHub,
// sign in on loopback, and write each detected coding agent's MCP entry and
// instructions. Every file change goes through `apply()`, which backs the file
// up first, writes atomically, and records it in a manifest so --uninstall can
// reverse exactly what was added. Re-running changes nothing.

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { chmod, mkdir, readFile, readdir, realpath, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CliError, EXIT, resolveOrigin } from "../config.js";
import { configDir, logout, storedLogin } from "../login.js";
import {
  CLIENT_IDS, LABEL, bridgeEntry, detect, edit, targets,
  type ClientId, type Ctx, type Edit, type EditHint, type Target,
} from "./clients.js";
import { DEFAULT_PORT, DEFAULT_PROJECT, dockerProblem, findLocal, devDown, devUp, readState } from "./stack.js";
import { isLoopback, localSignIn } from "./signin.js";
import { getAt } from "./jsonc.js";
import { gitRoot, indexRepo } from "./index.js";

export interface InitOptions {
  dryRun: boolean;
  yes: boolean;
  uninstall: boolean;
  force: boolean;
  /** Also write the repository's own files: AGENTS.md / CLAUDE.md block and per-client project rules. */
  project: boolean;
  clients: string[];
  url: string | null;
  port: number;
  noStart: boolean;
  /** Index the git repository init is run in (same code as `pipeshub index`). */
  index: boolean;
  email: string;
  cwd: string;
}

export interface FileReport {
  client: ClientId;
  file: string;
  what: Target["what"];
  status: Edit["status"] | "skipped";
  note?: string;
  /** Lines added, for --dry-run. */
  added?: string[];
}

export interface InitReport {
  dryRun: boolean;
  uninstall: boolean;
  origin?: string;
  stack?: string;
  signedIn?: string;
  /** The repository init indexed (or would), one line. */
  code?: string;
  clients: string[];
  files: FileReport[];
  warnings: string[];
  next: string[];
}

/** What init wrote to one file: its hash, the backup of what was there before (null = it did not exist), and the folders init made. */
interface Written { sha: string; original: string | null; madeDirs: string[] }

interface Manifest {
  version: 1;
  origin: string;
  startedStack: boolean;
  projectDirs: string[];
  /** Per file init changed. While a file still has the hash init left, uninstall puts the original back byte for byte. */
  files?: Record<string, Written>;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

const manifestPath = (env: NodeJS.ProcessEnv) => join(configDir(env), "init-manifest.json");

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function readManifest(env: NodeJS.ProcessEnv): Promise<Manifest | null> {
  try {
    const m = JSON.parse((await readText(manifestPath(env))) ?? "null") as Manifest | null;
    return m && m.version === 1 ? m : null;
  } catch {
    return null;
  }
}

/** Replaces the file in one step. A symlink is written through (not swapped for a plain file) and an existing file keeps its mode. */
export async function writeAtomic(path: string, text: string, mode?: number): Promise<void> {
  let target = path;
  try {
    target = await realpath(path);
    mode ??= (await stat(target)).mode & 0o7777;
  } catch {
    // no such file yet: create it at `path` with the default (or given) mode
  }
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, text, mode === undefined ? {} : { mode });
  if (mode !== undefined) await chmod(tmp, mode);
  await rename(tmp, target);
}

/** Copy a file we are about to change into the CLI's own backups directory (once per run and file). */
async function backup(file: string, stamp: string, env: NodeJS.ProcessEnv): Promise<string> {
  const dest = join(configDir(env), "backups", stamp, file.replace(/^[/\\]+/, "").replace(/[/\\:]/g, "__"));
  await mkdir(dirname(dest), { recursive: true, mode: 0o700 });
  await writeFile(dest, await readFile(file), { mode: 0o600 }); // a copy of the person's file: private like the rest of our store
  await chmod(dest, 0o600);
  return dest;
}

const addedLines = (before: string | null, after: string | null): string[] => {
  const had = new Set((before ?? "").split("\n"));
  return (after ?? "").split("\n").filter((l) => l.trim() !== "" && !had.has(l));
};

async function confirm(question: string, def: boolean, opts: InitOptions): Promise<boolean> {
  // Only a person at a terminal is asked; scripts and agents get the default.
  if (opts.yes || !process.stdin.isTTY || !process.stderr.isTTY) return def;
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const a = (await rl.question(`${question} ${def ? "[Y/n]" : "[y/N]"} `)).trim().toLowerCase();
  rl.close();
  return a === "" ? def : a.startsWith("y");
}

/** The folders on the way to `dir` that do not exist yet, outermost first. */
async function missingDirs(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (let d = dir; !(await stat(d).then(() => true, () => false)); d = dirname(d)) out.unshift(d);
  return out;
}

/** Plan one target and, unless dry-run, write it. `known` is what an earlier init recorded for files (updated here). */
async function apply(t: Target, mode: "add" | "remove", o: InitOptions, env: NodeJS.ProcessEnv, stamp: string, known: Record<string, Written>): Promise<FileReport> {
  const before = await readText(t.file);
  const rec = known[t.file];
  // Uninstall: a file still exactly as init left it goes back to what it was, byte for byte (or is deleted if init created it).
  if (mode === "remove" && rec && before !== null && sha(before) === rec.sha) {
    const original = rec.original === null ? null : await readText(rec.original);
    if (rec.original === null || original !== null) {
      const status: Edit["status"] = original === null ? "deleted" : "removed";
      if (!o.dryRun) {
        if (original === null) {
          await rm(t.file, { force: true });
          for (const d of [...rec.madeDirs].reverse()) if ((await readdir(d).catch(() => ["x"])).length === 0) await rmdir(d).catch(() => undefined);
        } else {
          await writeAtomic(t.file, original);
          if (rec.original) await rm(rec.original, { force: true }); // used: the file is back as it was
        }
        delete known[t.file];
      }
      return { client: t.client, file: t.file, what: t.what, status };
    }
  }
  // The object our entry sits in: did the person's own file have it before init? Then uninstall leaves it (as `{}` if it is empty).
  let hint: EditHint | undefined;
  if (mode === "remove" && t.kind === "json" && rec?.original) {
    const original = await readText(rec.original);
    if (original !== null) {
      try { hint = { parentExisted: getAt(original, t.path!.slice(0, -1)) !== undefined }; } catch { /* unreadable original: the default applies */ }
    }
  }
  const r = edit(t, before, mode, o.force, hint);
  const out: FileReport = { client: t.client, file: t.file, what: t.what, status: r.status, ...(r.note ? { note: r.note } : {}) };
  if (o.dryRun && r.after !== before) out.added = addedLines(before, r.after);
  if (o.dryRun || r.after === before) return out;
  const madeDirs = before === null ? await missingDirs(dirname(t.file)) : [];
  const backupPath = before !== null ? await backup(t.file, stamp, env) : null;
  if (backupPath) out.note = `backup: ${backupPath}`;
  if (r.after === null) await rm(t.file, { force: true });
  else await writeAtomic(t.file, r.after);
  if (mode === "add" && r.after !== null) {
    // The first original wins: a later run that changes our entry again still restores what the person had.
    known[t.file] = { sha: sha(r.after), original: rec ? rec.original : backupPath, madeDirs: rec ? rec.madeDirs : madeDirs };
  } else if (mode === "remove") {
    if (rec?.original) await rm(rec.original, { force: true }); // used for the hint above
    delete known[t.file];
  }
  return out;
}

function baseCtx(env: NodeJS.ProcessEnv, cwd: string): Ctx {
  return { env, home: env["HOME"] || homedir(), platform: process.platform, cwd };
}

function chooseClients(o: InitOptions, ctx: Ctx): ClientId[] {
  for (const c of o.clients) {
    if (!(CLIENT_IDS as readonly string[]).includes(c)) {
      throw new CliError(`unknown --client ${c}; one of ${CLIENT_IDS.join(", ")}`, EXIT.USAGE);
    }
  }
  return o.clients.length > 0 ? (o.clients as ClientId[]) : CLIENT_IDS.filter((id) => detect(id, ctx));
}

export async function init(o: InitOptions, env: NodeJS.ProcessEnv, say: (s: string) => void): Promise<{ exit: number; report: InitReport }> {
  if (o.uninstall) return uninstall(o, env, say);
  const ctx = baseCtx(env, o.cwd);
  const report: InitReport = { dryRun: o.dryRun, uninstall: false, clients: [], files: [], warnings: [], next: [] };
  const clients = chooseClients(o, ctx);
  report.clients = clients;
  if (clients.length === 0) {
    report.warnings.push("No supported coding agent found (looked for Claude Code, Codex, Claude Desktop, Cursor, Windsurf, VS Code, Gemini CLI, Zed, Cline). Install one, or name it with --client <name>.");
  } else {
    say(`Found ${clients.map((c) => LABEL[c]).join(", ")}.`);
  }

  // 1. The local stack.
  let origin: string | null = o.url !== null ? resolveOrigin({ PIPESHUB_BASE_URL: o.url }) : resolveOrigin(env);
  if (o.url !== null && origin === null) throw new CliError("--url needs an origin, e.g. http://127.0.0.1:3000", EXIT.USAGE);
  let startedStack = false;
  if (origin === null) {
    origin = await findLocal(env);
    if (origin !== null) report.stack = `found a running PipesHub at ${origin}`;
  } else {
    report.stack = `using ${origin}`;
  }
  if (origin === null) {
    origin = `http://127.0.0.1:${o.port}`;
    const problem = dockerProblem(env, o.dryRun ? 3000 : undefined); // a dry run only warns, so it never waits long for Docker
    if (o.dryRun) {
      report.stack = `would start the local stack with Docker on ${origin}`;
      if (problem) report.warnings.push(problem);
    } else if (o.noStart) {
      throw new CliError(`No PipesHub is running on this computer. Run 'pipeshub dev up' (needs Docker), or pass --url <origin>.`, EXIT.ERROR);
    } else {
      if (problem) throw new CliError(problem, EXIT.ERROR);
      if (!(await confirm("No local PipesHub is running. Start one with Docker now?", true, o))) {
        throw new CliError("Stopped: no PipesHub to connect to. Run 'pipeshub dev up' when you are ready.", EXIT.ERROR);
      }
      const state = await devUp({ port: o.port, project: env["PIPESHUB_PROJECT"] || DEFAULT_PROJECT, waitSeconds: 600 }, env, say);
      origin = state.origin;
      startedStack = true;
      report.stack = `started the local stack at ${origin}`;
    }
  }
  report.origin = origin;

  // 2. Sign in (no token goes anywhere but the CLI's credential store).
  if (o.dryRun) {
    report.signedIn = "would sign in to the local stack (creating the first account on a fresh one)";
  } else {
    const s = await localSignIn(origin, { email: o.email, env, say });
    report.signedIn = s.how === "already" ? "already signed in"
      : s.createdAccount ? `created the first account (${s.email}) and signed in`
      : s.how === "automatic" ? `signed in as ${s.email}` : "signed in from the browser";
  }

  // 3. Client files.
  const entry = bridgeEntry(origin);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const wantProject = o.project || (clients.length > 0 && (await confirm("Also add a PipesHub section to this repository's AGENTS.md / CLAUDE.md and per-client rule files?", false, o)));
  const projectDirs = new Set<string>();
  const prior = await readManifest(env);
  const known: Record<string, Written> = { ...(prior?.files ?? {}) };
  for (const id of clients) {
    for (const t of targets(id, ctx, entry)) {
      if (t.project && !wantProject) continue;
      let rep: FileReport;
      try {
        rep = await apply(t, "add", o, env, stamp, known);
      } catch (e) {
        rep = { client: id, file: t.file, what: t.what, status: "malformed", note: (e as Error).message };
      }
      report.files.push(rep);
      if (t.project && !["conflict", "malformed", "absent"].includes(rep.status)) projectDirs.add(o.cwd);
      if (rep.status === "conflict" || rep.status === "malformed") report.warnings.push(`${t.file}: ${rep.note ?? rep.status}`);
    }
  }

  // 4. Remember what we did, so --uninstall can undo it.
  if (!o.dryRun) {
    const m: Manifest = {
      version: 1,
      origin,
      startedStack: startedStack || (prior?.startedStack ?? false),
      projectDirs: [...new Set([...(prior?.projectDirs ?? []), ...projectDirs])],
      files: known,
    };
    await writeAtomic(manifestPath(env), JSON.stringify(m, null, 2) + "\n", 0o600);
  }

  const cmd = env["npm_command"] === "exec" ? "npx @pipeshub-ai/standalone" : "pipeshub";

  // 5. The repository init was run in: one command sets up the agents and indexes the code.
  const inRepo = gitRoot(o.cwd);
  let repoRoot = o.index ? inRepo : null;
  let indexedHere = false;
  // A repository that is the home directory would push dotfiles and everything else under it.
  if (repoRoot !== null && realpathSync(repoRoot) === realpathSync(env["HOME"] || homedir())) {
    report.warnings.push(`${repoRoot} is your home directory, so it was not indexed. Run '${cmd} index <repository>' for a project.`);
    repoRoot = null;
  }
  if (repoRoot !== null && !o.dryRun && !isLoopback(origin)
    && !(o.yes || await confirm(`${origin} is not on this computer. Send the files of ${repoRoot} to it?`, false, o))) {
    report.code = `not indexed (${origin} is not on this computer; --yes sends it)`;
    repoRoot = null;
  }
  if (repoRoot !== null) {
    if (o.dryRun) {
      report.code = `would index ${repoRoot}`;
    } else {
      say(`Indexing ${repoRoot} ...`);
      try {
        const login = await storedLogin(origin, false, env);
        if (!login) throw new CliError("not signed in", EXIT.UNAUTHENTICATED);
        const r = await indexRepo(repoRoot, { origin, token: login.accessToken }, (m) => say(m), Number(env["PIPESHUB_INDEX_WAIT_SECONDS"] ?? 180));
        const files = `${r.files} file${r.files === 1 ? "" : "s"}`;
        report.code = r.state === "ready"
          ? `${r.repo}: ${files}, ready${r.codeTools ? "" : " (code tools appear in a few seconds)"}`
          : `${r.repo}: ${files}, ${r.state}; indexing continues in the background`;
        indexedHere = true;
      } catch (e) {
        report.warnings.push(`Could not index ${repoRoot}: ${(e as Error).message}\nThe agents are set up; retry with: ${cmd} index`);
      }
    }
  }

  report.next.push(
    "Restart your coding agent (or open a new session) so it picks up the PipesHub server.",
    ...(indexedHere
      ? ['Then ask it about this repository, e.g. "what calls <a function>?" or "search PipesHub for our deployment process".']
      : ['Then ask it a question about what your team knows, e.g. "search PipesHub for our deployment process".']),
    "Put documents in: " + join(env["HOME"] || homedir(), ".pipeshub", "standalone", "workspace") + " (or connect a source at " + origin + ").",
    ...(indexedHere || (o.dryRun && repoRoot !== null) ? [`Undo everything with: ${cmd} uninstall`]
      : inRepo !== null ? [`Index this repository's code: ${cmd} index   (undo everything with: ${cmd} uninstall)`]
      : [`Index a repository's code: cd <repository> && ${cmd} index   (undo everything with: ${cmd} uninstall)`]),
  );
  return { exit: report.files.some((f) => f.status === "malformed") ? EXIT.ERROR : EXIT.OK, report };
}

async function uninstall(o: InitOptions, env: NodeJS.ProcessEnv, say: (s: string) => void): Promise<{ exit: number; report: InitReport }> {
  const ctx = baseCtx(env, o.cwd);
  const report: InitReport = { dryRun: o.dryRun, uninstall: true, clients: [], files: [], warnings: [], next: [] };
  const manifest = await readManifest(env);
  const known: Record<string, Written> = { ...(manifest?.files ?? {}) };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const clients = o.clients.length > 0 ? chooseClients(o, ctx) : [...CLIENT_IDS];
  const dirs = [...new Set([o.cwd, ...(manifest?.projectDirs ?? [])])];
  const entry = bridgeEntry(manifest?.origin ?? `http://127.0.0.1:${DEFAULT_PORT}`);
  for (const id of clients) {
    for (const dir of dirs) {
      for (const t of targets(id, { ...ctx, cwd: dir }, entry)) {
        // User files are visited once (with the first directory); project files once per directory.
        if (!t.project && dir !== dirs[0]) continue;
        let rep: FileReport;
        try {
          rep = await apply(t, "remove", o, env, stamp, known);
        } catch (e) {
          rep = { client: id, file: t.file, what: t.what, status: "malformed", note: (e as Error).message };
        }
        if (rep.status !== "absent") report.files.push(rep);
        if (rep.status === "conflict" || rep.status === "malformed") report.warnings.push(`${t.file}: ${rep.note ?? rep.status}`);
      }
    }
  }
  if (o.dryRun) {
    report.signedIn = "would sign out (the local account is kept: the stack's data is)";
  } else {
    const out = await logout(false, env).catch(() => ({ origin: null, revokeRequested: false }));
    // local-account.json stays: the stack's data does, and init needs that password to sign in to it again.
    report.signedIn = out.origin ? `signed out of ${out.origin}${out.revokeRequested ? " and asked the server to revoke it" : ""}` : "no stored sign-in";
    if (manifest?.startedStack) {
      say("Stopping the local stack (its data is kept)...");
      await devDown(false, env).then(() => { report.stack = "stopped the local stack (data kept; remove it with: pipeshub dev down --volumes)"; },
        (e: unknown) => { report.warnings.push(`could not stop the local stack: ${(e as Error).message}`); });
    }
    // Folders init made for its files (a commands folder that held several): gone once empty, deepest first.
    const made = new Set(Object.values(manifest?.files ?? {}).flatMap((w) => w.madeDirs));
    for (const d of [...made].sort((a, b) => b.length - a.length)) {
      if ((await readdir(d).catch(() => ["x"])).length === 0) await rmdir(d).catch(() => undefined);
    }
    await rm(manifestPath(env), { force: true });
  }
  if ((await readState(env)) && !manifest?.startedStack) report.next.push("The local stack was started with 'pipeshub dev up', so it is still running: pipeshub dev down");
  return { exit: report.files.some((f) => f.status === "malformed") ? EXIT.ERROR : EXIT.OK, report };
}

const VERB: Record<string, [string, string]> = {
  created: ["Created", "Would create"], updated: ["Updated", "Would update"], removed: ["Removed entry from", "Would remove entry from"],
  deleted: ["Deleted", "Would delete"], unchanged: ["Unchanged", "Unchanged"], conflict: ["Skipped", "Would skip"], malformed: ["Cannot edit", "Cannot edit"],
};

export function renderReport(r: InitReport): string {
  const lines: string[] = [];
  if (r.dryRun) lines.push("Dry run: nothing was changed.");
  if (r.stack) lines.push(`Stack:   ${r.stack}`);
  if (r.signedIn) lines.push(`Sign-in: ${r.signedIn}`);
  if (r.code) lines.push(`Code:    ${r.code}`);
  for (const f of r.files) {
    const [done, would] = VERB[f.status] ?? [f.status, f.status];
    lines.push(`${r.dryRun ? would : done} ${f.file}  (${LABEL[f.client]} ${f.what})${f.note && !f.note.startsWith("backup:") ? `: ${f.note}` : ""}`);
    const added = f.added ?? [];
    for (const a of added.slice(0, 20)) lines.push(`    + ${a}`);
    if (added.length > 20) lines.push(`    + ... ${added.length - 20} more lines`);
  }
  for (const w of r.warnings.filter((x) => !r.files.some((f) => x.startsWith(f.file)))) lines.push(`Warning: ${w}`);
  if (!r.dryRun && r.next.length) lines.push("", ...r.next.map((n) => `  ${n}`));
  return lines.join("\n");
}
