// `pipeshub dev up|down|status`: drive the local slim stack (the app and
// PostgreSQL) with Docker Compose, from a pinned compose file kept in
// ~/.pipeshub/standalone. No repository checkout is needed.

import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CliError, EXIT } from "../config.js";
import { SECRET_NAMES, composeFile } from "./assets.js";
import { SECCOMP_PROFILE } from "./seccomp.js";

export const DEFAULT_PORT = 3000;

/** The docker executable: PIPESHUB_DOCKER for one outside the PATH, else `docker`. */
export const dockerBin = (env: NodeJS.ProcessEnv): string => env["PIPESHUB_DOCKER"] || "docker";
export const DEFAULT_PROJECT = "pipeshub-standalone";

export interface StackState {
  project: string;
  port: number;
  origin: string;
}

export const standaloneDir = (env: NodeJS.ProcessEnv = process.env) => join(env["HOME"] || homedir(), ".pipeshub", "standalone");
const statePath = (env: NodeJS.ProcessEnv) => join(standaloneDir(env), "state.json");

export async function readState(env: NodeJS.ProcessEnv = process.env): Promise<StackState | null> {
  try {
    const s = JSON.parse(await readFile(statePath(env), "utf8")) as Partial<StackState>;
    return typeof s.project === "string" && typeof s.origin === "string" && typeof s.port === "number" ? (s as StackState) : null;
  } catch {
    return null;
  }
}

async function writeAtomic(path: string, text: string, mode: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, text, { mode });
  await chmod(tmp, mode);
  await rename(tmp, path);
}

/** Null when Docker and Compose work, else the sentence to show. A slow or hung Docker counts as a problem once `timeoutMs` passes. */
export function dockerProblem(env: NodeJS.ProcessEnv = process.env, timeoutMs = 30_000): string | null {
  const run = (args: string[]) => spawnSync(dockerBin(env), args, { env, encoding: "utf8", timeout: timeoutMs });
  const compose = run(["compose", "version"]);
  if (compose.error && (compose.error as NodeJS.ErrnoException).code === "ENOENT") {
    return "Docker is not installed. Install Docker Desktop (https://docs.docker.com/get-docker/) or Docker Engine, then run this again.";
  }
  if (compose.status !== 0) {
    return "Docker is installed but 'docker compose' is not available. Install the Compose plugin (https://docs.docker.com/compose/install/).";
  }
  const info = run(["info", "--format", "{{.ServerVersion}}"]);
  if (info.status !== 0) {
    return "Docker is installed but not running, or this user cannot reach it. Start Docker Desktop (or 'sudo systemctl start docker'), then run this again.";
  }
  return null;
}

/** True when a PipesHub answers at the origin. */
export async function healthy(origin: string, timeoutMs = 3000): Promise<boolean> {
  try {
    return (await fetch(`${origin}/api/v1/health`, { signal: AbortSignal.timeout(timeoutMs) })).ok;
  } catch {
    return false;
  }
}

/** The version of the package this code runs from (written into the compose file's header); "unknown" when its package.json is not found. */
async function cliVersion(): Promise<string> {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++, dir = dirname(dir)) {
    try {
      const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as { name?: string; version?: string };
      if (pkg.name?.startsWith("@pipeshub-ai/") && pkg.version) return pkg.version;
    } catch {
      // keep walking
    }
  }
  return "unknown";
}

export const parseEnvFile = (text: string) =>
  Object.fromEntries(text.split("\n").filter((l) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));

/** Write the compose file and the .env (secrets generated once, never rewritten). */
async function prepare(port: number, project: string, env: NodeJS.ProcessEnv): Promise<string> {
  const dir = standaloneDir(env);
  await mkdir(join(dir, "workspace"), { recursive: true, mode: 0o700 });
  await writeAtomic(join(dir, "docker-compose.yml"), composeFile(await cliVersion()), 0o600);
  await writeAtomic(join(dir, "seccomp-browser.json"), SECCOMP_PROFILE, 0o600);
  const have = parseEnvFile(await readFile(join(dir, ".env"), "utf8").catch(() => ""));
  for (const name of SECRET_NAMES) have[name] ||= randomBytes(24).toString("hex");
  have["PIPESHUB_PORT"] = String(port);
  have["PIPESHUB_PROJECT"] = project;
  have["PIPESHUB_WORKSPACE"] = join(dir, "workspace");
  await writeAtomic(join(dir, ".env"), Object.entries(have).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", 0o600);
  return dir;
}

function compose(args: string[], project: string, env: NodeJS.ProcessEnv): number {
  const dir = standaloneDir(env);
  const r = spawnSync(
    dockerBin(env),
    ["compose", "-p", project, "--env-file", join(dir, ".env"), "-f", join(dir, "docker-compose.yml"), ...args],
    // Progress goes to stderr so stdout stays JSON.
    { env, stdio: ["ignore", 2, 2] },
  );
  return r.status ?? 1;
}

/**
 * The images of the two services that run PipesHub's own database and migrations, as compose resolves them (PG_IMAGE, PIPESHUB_MIGRATE_IMAGE
 * and their tags included). Empty when compose does not say, in which case `up` is left to report.
 */
function ownImages(project: string, env: NodeJS.ProcessEnv): string[] {
  const dir = standaloneDir(env);
  const r = spawnSync(
    dockerBin(env),
    ["compose", "-p", project, "--env-file", join(dir, ".env"), "-f", join(dir, "docker-compose.yml"), "config", "--format", "json"],
    { env, encoding: "utf8", timeout: 30_000 },
  );
  try {
    const services = (JSON.parse(r.stdout) as { services?: Record<string, { image?: string }> }).services ?? {};
    return [...new Set([services["postgres"]?.image, services["pipeshub-migrate"]?.image].filter((i): i is string => !!i))];
  } catch {
    return [];
  }
}

/** Fails at once, naming the image, when one of the stack's own images is neither here nor pullable (instead of Docker's raw error from `up`). */
function ensureOwnImages(project: string, env: NodeJS.ProcessEnv, say: (s: string) => void): void {
  const run = (args: string[]) => spawnSync(dockerBin(env), args, { env, encoding: "utf8", timeout: 600_000 });
  for (const image of ownImages(project, env)) {
    if (run(["image", "inspect", image]).status === 0) continue;
    say(`Pulling ${image} ...`);
    if (run(["pull", "--quiet", image]).status !== 0) {
      throw new CliError(
        `The image ${image} could not be pulled (it may not be published yet, or the registry is unreachable). `
          + "Set PG_IMAGE (and PG_TAG) or PIPESHUB_MIGRATE_IMAGE (and MIGRATE_TAG) to an image you built locally, then run this again.",
        EXIT.ERROR,
      );
    }
  }
}

export async function devUp(
  opts: { port: number; project: string; waitSeconds: number },
  env: NodeJS.ProcessEnv = process.env,
  say: (s: string) => void = () => undefined,
): Promise<StackState> {
  const problem = dockerProblem(env);
  if (problem) throw new CliError(problem, EXIT.ERROR);
  await prepare(opts.port, opts.project, env);
  const origin = `http://127.0.0.1:${opts.port}`;
  say(`Starting PipesHub on ${origin} (first start downloads the images; later starts take about 30 s)...`);
  ensureOwnImages(opts.project, env, say);
  const code = compose(["up", "-d"], opts.project, env);
  if (code !== 0) {
    // Compose creates the network and the database container before it finds the port taken: remove them, but never the data volumes.
    compose(["down"], opts.project, env);
    throw new CliError(
      `'docker compose up' failed (exit ${code}). If port ${opts.port} is taken, pick another with --port; if the images cannot be pulled, check your network or PIPESHUB_IMAGE / IMAGE_TAG.`,
      EXIT.ERROR,
    );
  }
  const state: StackState = { project: opts.project, port: opts.port, origin };
  await writeAtomic(statePath(env), JSON.stringify(state, null, 2) + "\n", 0o600);
  const deadline = Date.now() + opts.waitSeconds * 1000;
  while (!(await healthy(origin))) {
    if (Date.now() > deadline) {
      throw new CliError(`PipesHub did not become healthy at ${origin} within ${opts.waitSeconds} s. Look at: docker compose -p ${opts.project} logs pipeshub-slim`, EXIT.ERROR);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return state;
}

export async function devDown(volumes: boolean, env: NodeJS.ProcessEnv = process.env): Promise<{ stopped: boolean; project?: string }> {
  const state = await readState(env);
  if (!state) return { stopped: false };
  const problem = dockerProblem(env);
  if (problem) throw new CliError(problem, EXIT.ERROR);
  const code = compose(["down", ...(volumes ? ["--volumes"] : [])], state.project, env);
  if (code !== 0) throw new CliError(`'docker compose down' failed (exit ${code}).`, EXIT.ERROR);
  if (volumes) await rm(statePath(env), { force: true });
  return { stopped: true, project: state.project };
}

/** Docker's health of the graph database container: healthy, unhealthy, starting, or unknown when it is not running. */
function neo4jHealth(state: StackState, env: NodeJS.ProcessEnv): string {
  const dir = standaloneDir(env);
  const r = spawnSync(
    dockerBin(env),
    ["compose", "-p", state.project, "--env-file", join(dir, ".env"), "-f", join(dir, "docker-compose.yml"), "ps", "--format", "{{.Health}}", "neo4j"],
    { env, encoding: "utf8", timeout: 15_000 },
  );
  return r.status === 0 && r.stdout.trim() !== "" ? r.stdout.trim() : "unknown";
}

export async function devStatus(env: NodeJS.ProcessEnv = process.env) {
  const state = await readState(env);
  const problem = dockerProblem(env);
  return {
    docker: problem === null ? "ok" : problem,
    configured: state !== null,
    ...(state ? { project: state.project, origin: state.origin, healthy: await healthy(state.origin), neo4j: problem === null ? neo4jHealth(state, env) : "unknown" } : {}),
  };
}

/** True when the origin's discovery document names the CLI sign-in client, which only a PipesHub with an organisation does. */
async function offersCliSignIn(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(1500) });
    const meta = res.ok ? ((await res.json()) as Record<string, unknown>) : {};
    return typeof meta["pipeshub_device_client_id"] === "string" && meta["pipeshub_device_client_id"] !== "";
  } catch {
    return false;
  }
}

/**
 * True when `origin` is the stack `pipeshub dev up` started: state.json names it, and Docker says that compose project's app container
 * publishes that port. Anything else on loopback (a stale port, another program) is only a listener, and gets nothing of ours.
 */
export async function ownsOrigin(origin: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const state = await readState(env);
  if (!state || state.origin !== origin) return false;
  const dir = standaloneDir(env);
  const r = spawnSync(
    dockerBin(env),
    ["compose", "-p", state.project, "--env-file", join(dir, ".env"), "-f", join(dir, "docker-compose.yml"), "port", "pipeshub-slim", "3000"],
    { env, encoding: "utf8", timeout: 15_000 },
  );
  return r.status === 0 && r.stdout.trim().endsWith(`:${state.port}`);
}

/**
 * A PipesHub already running on this computer: the one `dev up` started (and Docker confirms), else one on the default port that shows it
 * is PipesHub. A listener that only answers the health check is not enough: anything on loopback can, and a fresh-looking one would be
 * sent the password of the first account.
 */
export async function findLocal(env: NodeJS.ProcessEnv = process.env, port: number = DEFAULT_PORT): Promise<string | null> {
  const state = await readState(env);
  if (state?.origin && (await healthy(state.origin, 1500)) && (await ownsOrigin(state.origin, env))) return state.origin;
  const origin = `http://127.0.0.1:${port}`;
  return (await healthy(origin, 1500)) && (await offersCliSignIn(origin)) ? origin : null;
}
