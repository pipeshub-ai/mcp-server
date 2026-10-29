// `pipeshub mcp install --client <name>`: add PipesHub to an MCP client's
// config. The entry runs the local stdio server (`npx @pipeshub-ai/mcp@>=X
// start`), which uses the `pipeshub login` sign-in, so no token is written
// anywhere. The range starts at the first release whose `start` reads that
// sign-in: an older one would run with no credential, and before X is on npm
// the entry fails loudly instead.
//
// Clients with their own `mcp add` command get it run for them, since they own
// their config format. The two without one have a small JSON file we merge into.

import { spawnSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CliError, EXIT } from "./config.js";

export const MCP_CLIENTS = ["claude-code", "cursor", "codex", "gemini", "claude-desktop"] as const;
export type McpClient = (typeof MCP_CLIENTS)[number];

const NAME = "pipeshub";

export interface InstallResult {
  client: McpClient;
  /** The config file written, or the command run. */
  wrote?: string;
  ran?: string;
  entry: { command: string; args: string[] };
  dryRun: boolean;
  next: string;
}

/** The first release whose stdio `start` falls back to the `pipeshub login` sign-in, trial workspaces included (4.8.0 does not read a trial credential). Ships with this command. */
export const FIRST_START_WITH_SIGN_IN = "4.9.0";

function entryFor(origin: string): { command: string; args: string[] } {
  return {
    command: "npx",
    args: ["-y", `@pipeshub-ai/mcp@>=${FIRST_START_WITH_SIGN_IN}`, "start", "--server-url", origin],
  };
}

function home(env: NodeJS.ProcessEnv): string {
  return env["HOME"] || homedir();
}

function desktopConfigPath(env: NodeJS.ProcessEnv): string {
  if (process.platform === "darwin") {
    return join(home(env), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32" && env["APPDATA"]) {
    return join(env["APPDATA"], "Claude", "claude_desktop_config.json");
  }
  throw new CliError("Claude Desktop runs on macOS and Windows only; nothing to configure here.", EXIT.USAGE);
}

/** Merge `mcpServers.pipeshub` into a JSON config, keeping everything else. */
async function mergeJson(path: string, entry: object, force: boolean, dryRun: boolean): Promise<void> {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new CliError(`${path} is not valid JSON; fix or move it, then run this again.`, EXIT.ERROR);
    }
  }
  const servers = (config["mcpServers"] ?? {}) as Record<string, unknown>;
  if (servers[NAME] !== undefined && !force) {
    throw new CliError(`${path} already has a "${NAME}" server. Pass --force to replace it.`, EXIT.USAGE);
  }
  if (dryRun) return;
  config["mcpServers"] = { ...servers, [NAME]: entry };
  await mkdir(dirname(path), { recursive: true });
  // Via rename, so a crash mid-write cannot leave the client with half a config.
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(config, null, 2) + "\n");
  await rename(tmp, path);
}

/**
 * Run a client's own `mcp add` (after its `mcp remove`, with --force); the
 * command line is returned for the report. The client refuses a duplicate itself.
 */
function runAdd(binary: string, args: string[], remove: string[] | null, dryRun: boolean): string {
  const shown = [binary, ...args].join(" ");
  if (dryRun) return remove ? `${[binary, ...remove].join(" ")} && ${shown}` : shown;
  // Nothing to remove is fine; the add below reports anything real.
  if (remove) spawnSync(binary, remove, { encoding: "utf8" });
  const r = spawnSync(binary, args, { encoding: "utf8" });
  if (r.error) {
    throw new CliError(`could not run ${binary} (${r.error.message}). Is it installed and on PATH?`, EXIT.ERROR);
  }
  if (r.status !== 0) {
    throw new CliError(`${shown} failed: ${(r.stderr || r.stdout).trim() || `exit ${r.status}`}`, EXIT.ERROR);
  }
  return shown;
}

export async function mcpInstall(
  client: McpClient,
  origin: string,
  opts: { force: boolean; dryRun: boolean },
  env: NodeJS.ProcessEnv = process.env,
): Promise<InstallResult> {
  const entry = entryFor(origin);
  const base = { client, entry, dryRun: opts.dryRun };
  // `--` before the server command, or the client reads the server's `-y` as its own flag.
  const server = ["--", entry.command, ...entry.args];
  switch (client) {
    case "claude-code": {
      const ran = runAdd(
        "claude",
        ["mcp", "add", "--scope", "user", NAME, ...server],
        opts.force ? ["mcp", "remove", "--scope", "user", NAME] : null,
        opts.dryRun,
      );
      return { ...base, ran, next: "Restart Claude Code, then check it with: claude mcp list" };
    }
    case "gemini": {
      const ran = runAdd("gemini", ["mcp", "add", NAME, ...server], opts.force ? ["mcp", "remove", NAME] : null, opts.dryRun);
      return { ...base, ran, next: "Restart Gemini CLI, then check it with: gemini mcp list" };
    }
    case "codex": {
      const ran = runAdd("codex", ["mcp", "add", NAME, ...server], opts.force ? ["mcp", "remove", NAME] : null, opts.dryRun);
      return { ...base, ran, next: "Start a new Codex session, then check it with: codex mcp list" };
    }
    case "cursor": {
      const path = join(home(env), ".cursor", "mcp.json");
      await mergeJson(path, entry, opts.force, opts.dryRun);
      return { ...base, wrote: path, next: "Reload Cursor; PipesHub appears under Settings → MCP" };
    }
    case "claude-desktop": {
      const path = desktopConfigPath(env);
      await mergeJson(path, entry, opts.force, opts.dryRun);
      return { ...base, wrote: path, next: "Quit and reopen Claude Desktop" };
    }
  }
}
