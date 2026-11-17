#!/usr/bin/env node
// The Claude Code plugin's /pipeshub:setup (local) and /pipeshub:index run this.
// It only finds the PipesHub CLI that has the local commands (`init --local`,
// `index`) and runs them; when none is installed it says how to get one.
//
//   node pipeshub-local.mjs setup          -> pipeshub init --local --client claude-code
//   node pipeshub-local.mjs index [path]   -> pipeshub index [path]
//
// Exit codes: the CLI's own, or 1 when no such CLI is found, 2 on a usage error.

import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE = "@pipeshub-ai/standalone";

// cmd.exe metacharacters, as cross-spawn escapes them (lib/util/escape.js).
const META = /([()\][%!^"`<>&|;, *?])/g;

/** One argument for cmd.exe, which then hands it to the program parsed by the MSVC rules. */
export function cmdArgument(arg) {
  let a = arg
    .replace(/(\\*)"/g, '$1$1\\"') // backslashes before a quote are doubled, the quote escaped
    .replace(/(\\*)$/, "$1$1"); // trailing backslashes are doubled: the closing quote follows
  a = `"${a}"`.replace(META, "^$1");
  // A .cmd shim passes %* to node in a line cmd.exe parses again, so escape a second time.
  return a.replace(META, "^$1");
}

/**
 * How to start `name` with `args`, never through a shell's word splitting: an
 * argument array everywhere; on Windows a .cmd shim (npx.cmd, pipeshub.cmd)
 * can only run under cmd.exe (Node refuses to spawn one directly), so each
 * argument is quoted for it. Null when `name` is not on the Windows PATH.
 */
export function command(name, args, platform = process.platform, env = process.env) {
  if (platform !== "win32") return { file: name, args, options: {} };
  const dirs = (env["PATH"] ?? env["Path"] ?? "").split(";").filter(Boolean);
  const found = dirs.flatMap((d) => [".exe", ".cmd"].map((ext) => join(d, name + ext))).find((p) => existsSync(p));
  if (found === undefined) return null;
  if (found.endsWith(".exe")) return { file: found, args, options: {} };
  const line = [found.replace(META, "^$1"), ...args.map(cmdArgument)].join(" ");
  return { file: env["ComSpec"] ?? "cmd.exe", args: ["/d", "/s", "/c", `"${line}"`], options: { windowsVerbatimArguments: true } };
}

function run(name, args, options) {
  const c = command(name, args);
  if (c === null) return { status: null, error: new Error(`${name} not found`) };
  return spawnSync(c.file, c.args, { ...c.options, ...options });
}

function main(argv) {
  const [action, ...rest] = argv;
  const args = action === "index" ? ["index", ...rest]
    : action === "setup" ? ["init", "--local", "--client", "claude-code", ...rest]
    : null;
  if (args === null) {
    process.stderr.write("usage: pipeshub-local.mjs setup | index [path]\n");
    return 2;
  }

  // A CLI counts only when its help lists `index [path]`: an older `pipeshub` has neither local command.
  const hasLocal = ([name, ...pre]) => {
    const r = run(name, [...pre, "--help"], { encoding: "utf8", timeout: 180_000 });
    return r.status === 0 && /^\s+index \[path\]/m.test(r.stdout ?? "");
  };
  const runtime = [["pipeshub"], ["npx", "-y", PACKAGE]].find(hasLocal);
  if (runtime === undefined) {
    process.stderr.write(
      "PipesHub's local runtime is not installed: no 'pipeshub' command with 'init --local' and 'index' was found, "
        + `and 'npx ${PACKAGE}' is not available.\n`
        + `Install the local runtime first: npx ${PACKAGE} init --local\n`
        + "(it needs Docker and Node 20 or later; it starts PipesHub on this computer, signs in and indexes this repository).\n",
    );
    return 1;
  }

  const [name, ...pre] = runtime;
  const r = run(name, [...pre, ...args], { stdio: "inherit" });
  if (r.error) {
    process.stderr.write(`could not run ${name}: ${r.error.message}\n`);
    return 1;
  }
  return r.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
