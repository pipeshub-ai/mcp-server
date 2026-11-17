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

const PACKAGE = "@pipeshub-ai/standalone";
// shortcut: Windows needs a shell to start npx.cmd / pipeshub.cmd, so a path argument with spaces breaks there; quote args if Windows users hit it.
const shell = process.platform === "win32";

const [action, ...rest] = process.argv.slice(2);
const args = action === "index" ? ["index", ...rest]
  : action === "setup" ? ["init", "--local", "--client", "claude-code", ...rest]
  : null;
if (args === null) {
  process.stderr.write("usage: pipeshub-local.mjs setup | index [path]\n");
  process.exit(2);
}

// A CLI counts only when its help lists `index [path]`: an older `pipeshub` has neither local command.
const hasLocal = ([cmd, ...pre]) => {
  const r = spawnSync(cmd, [...pre, "--help"], { encoding: "utf8", shell, timeout: 180_000 });
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
  process.exit(1);
}

const [cmd, ...pre] = runtime;
const r = spawnSync(cmd, [...pre, ...args], { stdio: "inherit", shell });
if (r.error) {
  process.stderr.write(`could not run ${cmd}: ${r.error.message}\n`);
  process.exit(1);
}
process.exit(r.status ?? 1);
