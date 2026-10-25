// `pipeshub init` / `pipeshub uninstall`: find or start the local PipesHub,
// sign in on loopback, and write each detected coding agent's MCP entry and
// instructions. Every file change goes through `apply()`, which backs the file
// up first, writes atomically, and records it in a manifest so --uninstall can
// reverse exactly what was added. Re-running changes nothing.

import { createInterface } from "node:readline/promises";
import { chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CliError, EXIT, resolveOrigin } from "../config.js";
import { configDir, logout } from "../login.js";
import {
  CLIENT_IDS, LABEL, bridgeEntry, detect, edit, targets,
  type ClientId, type Ctx, type Edit, type Target,
} from "./clients.js";
import { DEFAULT_PORT, DEFAULT_PROJECT, dockerProblem, findLocal, devDown, devUp, readState } from "./stack.js";
import { forgetAccount, localSignIn } from "./signin.js";

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
  clients: string[];
  files: FileReport[];
  warnings: string[];
  next: string[];
}

interface Manifest {
  version: 1;
  origin: string;
  startedStack: boolean;
  projectDirs: string[];
}

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

async function writeAtomic(path: string, text: string, mode?: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, text, mode === undefined ? {} : { mode });
  if (mode !== undefined) await chmod(tmp, mode);
  await rename(tmp, path);
}

/** Copy a file we are about to change into the CLI's own backups directory (once per run and file). */
async function backup(file: string, stamp: string, env: NodeJS.ProcessEnv): Promise<string> {
  const dest = join(configDir(env), "backups", stamp, file.replace(/^[/\\]+/, "").replace(/[/\\:]/g, "__"));
  await mkdir(dirname(dest), { recursive: true, mode: 0o700 });
  await copyFile(file, dest);
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

/** Plan one target and, unless dry-run, write it. */
async function apply(t: Target, mode: "add" | "remove", o: InitOptions, env: NodeJS.ProcessEnv, stamp: string): Promise<FileReport> {
  const before = await readText(t.file);
  const r = edit(t, before, mode, o.force);
  const rep: FileReport = { client: t.client, file: t.file, what: t.what, status: r.status, ...(r.note ? { note: r.note } : {}) };
  if (o.dryRun && r.after !== before) rep.added = addedLines(before, r.after);
  if (o.dryRun || r.after === before) return rep;
  if (before !== null) rep.note = `backup: ${await backup(t.file, stamp, env)}`;
  if (r.after === null) await rm(t.file, { force: true });
  else await writeAtomic(t.file, r.after);
  return rep;
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
    const problem = dockerProblem(env);
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
  for (const id of clients) {
    for (const t of targets(id, ctx, entry)) {
      if (t.project && !wantProject) continue;
      let rep: FileReport;
      try {
        rep = await apply(t, "add", o, env, stamp);
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
    const prior = await readManifest(env);
    const m: Manifest = {
      version: 1,
      origin,
      startedStack: startedStack || (prior?.startedStack ?? false),
      projectDirs: [...new Set([...(prior?.projectDirs ?? []), ...projectDirs])],
    };
    await writeAtomic(manifestPath(env), JSON.stringify(m, null, 2) + "\n", 0o600);
  }

  report.next.push(
    "Restart your coding agent (or open a new session) so it picks up the PipesHub server.",
    'Then ask it a question about what your team knows, e.g. "search PipesHub for our deployment process".',
    "Put documents in: " + join(env["HOME"] || homedir(), ".pipeshub", "standalone", "workspace") + " (or connect a source at " + origin + ").",
    "Index this repository's code: pipeshub index   (undo everything with: pipeshub uninstall)",
  );
  return { exit: report.files.some((f) => f.status === "malformed") ? EXIT.ERROR : EXIT.OK, report };
}

async function uninstall(o: InitOptions, env: NodeJS.ProcessEnv, say: (s: string) => void): Promise<{ exit: number; report: InitReport }> {
  const ctx = baseCtx(env, o.cwd);
  const report: InitReport = { dryRun: o.dryRun, uninstall: true, clients: [], files: [], warnings: [], next: [] };
  const manifest = await readManifest(env);
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
          rep = await apply(t, "remove", o, env, stamp);
        } catch (e) {
          rep = { client: id, file: t.file, what: t.what, status: "malformed", note: (e as Error).message };
        }
        if (rep.status !== "absent") report.files.push(rep);
        if (rep.status === "conflict" || rep.status === "malformed") report.warnings.push(`${t.file}: ${rep.note ?? rep.status}`);
      }
    }
  }
  if (o.dryRun) {
    report.signedIn = "would sign out and forget the local account";
  } else {
    const out = await logout(false, env).catch(() => ({ origin: null, revokeRequested: false }));
    await forgetAccount(env);
    report.signedIn = out.origin ? `signed out of ${out.origin}${out.revokeRequested ? " and asked the server to revoke it" : ""}` : "no stored sign-in";
    if (manifest?.startedStack) {
      say("Stopping the local stack (its data is kept)...");
      await devDown(false, env).then(() => { report.stack = "stopped the local stack (data kept; remove it with: pipeshub dev down --volumes)"; },
        (e: unknown) => { report.warnings.push(`could not stop the local stack: ${(e as Error).message}`); });
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
