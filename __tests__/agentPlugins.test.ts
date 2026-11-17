import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error: a plain .mjs script, no type declarations
import { command } from "../scripts/pipeshub-local.mjs";

// The plugins are thin: manifests and Markdown over the `pipeshub` CLI. What
// can break is a manifest a client refuses, a command pointing at a file that
// is not there, or the local helper running something other than the CLI's
// own local commands, or hiding why it could not.

const root = join(import.meta.dir, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p));
const SCRIPT = join(root, "scripts", "pipeshub-local.mjs");
const NODE = Bun.which("node") ?? process.execPath;
const HELP_WITH_INDEX = "COMMANDS\n  index [path]                push a git repository into the code graph";

describe("pipeshub-local.mjs", () => {
  let bin = "";
  beforeEach(async () => {
    bin = await mkdtemp(join(tmpdir(), "pipeshub-local-"));
  });
  afterEach(() => rm(bin, { recursive: true, force: true }));

  /** A fake executable that logs its arguments and answers --help with `help`. */
  const fake = async (name: string, help: string | null, exit = 0, say = "") => {
    const body = [
      "#!/bin/sh",
      `echo "${name} $*" >> "${join(bin, "calls")}"`,
      `case " $* " in *" --help "*) ${help === null ? "echo 'npm error 404 Not Found' >&2; exit 1" : `printf '%s\\n' '${help}'; exit 0`};; esac`,
      say ? `echo '${say}' >&2` : "",
      `exit ${exit}`,
    ].join("\n");
    await writeFile(join(bin, name), body + "\n");
    await chmod(join(bin, name), 0o755);
  };
  const run = (args: string[]) => {
    const r = spawnSync(NODE, [SCRIPT, ...args], { encoding: "utf8", env: { PATH: bin, HOME: bin } });
    return { code: r.status, stderr: r.stderr, stdout: r.stdout };
  };
  const calls = async () => (await readFile(join(bin, "calls"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean);

  test("with no CLI at all, it says to install the local runtime first", () => {
    const r = run(["index"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Install the local runtime first: npx @pipeshub-ai/standalone init --local");
  });

  test("an older pipeshub without index, and the runtime not on npm, is the same clear message", async () => {
    await fake("pipeshub", "COMMANDS\n  search <query>   locate records");
    await fake("npx", null);
    const r = run(["setup"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("PipesHub's local runtime is not installed");
    // Only the help probes ran: nothing was set up or sent.
    expect(await calls()).toEqual(["pipeshub --help", "npx -y @pipeshub-ai/standalone --help"]);
  });

  test("index runs the CLI's own index and passes its output and exit code through", async () => {
    // What the CLI does when no PipesHub answers: it names the next step and fails.
    await fake("pipeshub", HELP_WITH_INDEX, 1, "could not reach http://localhost:3000: connection refused. Start it with pipeshub dev up");
    const r = run(["index", "/repo"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("pipeshub dev up");
    expect(r.stderr).not.toContain("not installed");
    expect(await calls()).toEqual(["pipeshub --help", "pipeshub index /repo"]);
  });

  test("setup runs init --local for Claude Code", async () => {
    await fake("pipeshub", HELP_WITH_INDEX);
    expect(run(["setup"]).code).toBe(0);
    expect((await calls()).at(-1)).toBe("pipeshub init --local --client claude-code");
  });

  test("without a global pipeshub it uses the runtime package through npx", async () => {
    await fake("npx", HELP_WITH_INDEX, 0);
    expect(run(["index"]).code).toBe(0);
    expect((await calls()).at(-1)).toBe("npx -y @pipeshub-ai/standalone index");
  });

  test("POSIX: a repository path with spaces and quotes reaches the CLI as one argument, unchanged", async () => {
    const path = `${bin}/my repo "odd" it's & $HOME *`;
    // Writes each argument NUL-terminated, so a split or rewritten argument shows.
    await writeFile(join(bin, "pipeshub"), [
      "#!/bin/sh",
      `case " $* " in *" --help "*) printf '%s\\n' '${HELP_WITH_INDEX}'; exit 0;; esac`,
      `for a in "$@"; do printf '%s\\0' "$a"; done > "${join(bin, "argv")}"`,
    ].join("\n") + "\n");
    await chmod(join(bin, "pipeshub"), 0o755);
    expect(run(["index", path]).code).toBe(0);
    expect((await readFile(join(bin, "argv"), "utf8")).split("\0").slice(0, -1)).toEqual(["index", path]);
  });

  test("Windows: a .cmd shim runs under cmd.exe with each argument quoted, so the path arrives unchanged", async () => {
    const dir = join(bin, "Program Files", "nodejs");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "pipeshub.cmd"), "");
    // One quote, so a quote the escaping missed would leave the & outside quotes.
    const path = 'C:\\Users\\Jo Smith\\it"s & 100% (x)\\';
    const env = { Path: `C:\\nowhere;${dir}`, ComSpec: "C:\\Windows\\system32\\cmd.exe" };
    const c = command("pipeshub", ["index", path], "win32", env);
    expect(c.file).toBe(env.ComSpec);
    expect(c.options).toEqual({ windowsVerbatimArguments: true });
    expect(c.args.slice(0, 3)).toEqual(["/d", "/s", "/c"]);
    // What happens to the line: /s drops the outer quotes, cmd.exe parses it, the shim's %* line is parsed
    // again, then node splits it by the MSVC rules.
    const [program, rest] = cmdPass(c.args[3].slice(1, -1), true);
    expect(program).toBe(join(dir, "pipeshub.cmd"));
    expect(msvcrtArgv(cmdPass(rest, false) as string)).toEqual(["index", path]);
  });

  test("Windows: an .exe runs directly with the argument array, and a missing CLI is null", async () => {
    await writeFile(join(bin, "npx.exe"), "");
    const args = ["-y", "@pipeshub-ai/standalone", 'a b "c"'];
    expect(command("npx", args, "win32", { PATH: bin })).toEqual({ file: join(bin, "npx.exe"), args, options: {} });
    expect(command("pipeshub", ["index"], "win32", { PATH: bin })).toBeNull();
    expect(command("pipeshub", args, "linux", {})).toEqual({ file: "pipeshub", args, options: {} });
  });

  test("anything else is a usage error that runs nothing", async () => {
    await fake("pipeshub", HELP_WITH_INDEX);
    expect(run(["uninstall"]).code).toBe(2);
    expect(await calls()).toEqual([]);
  });
});

describe("plugin manifests", () => {
  test("the Claude Code commands that run the helper point at a file in the plugin", () => {
    for (const f of ["commands/index.md", "commands/setup.md"]) {
      const text = read(f);
      expect(text, f).toMatch(/^---\ndescription: \S/);
      expect(text, f).toContain('node "${CLAUDE_PLUGIN_ROOT}/scripts/pipeshub-local.mjs"');
    }
    expect(existsSync(SCRIPT)).toBe(true);
  });

  test("Codex installs the repository root as a portable plugin from the Claude marketplace file", () => {
    // Codex reads .claude-plugin/marketplace.json as a legacy-compatible marketplace and loads the
    // entry's root plugin.json, mcp.json and skills/ (checked with codex-cli 0.169.0).
    const entry = json(".claude-plugin/marketplace.json").plugins[0];
    expect(entry.source).toBe(".");
    const portable = json("plugin.json");
    expect(portable.name).toBe(entry.name);
    expect(portable.version).toBe(json("package.json").version);
    expect(Object.keys(json("mcp.json").mcpServers)).toContain("pipeshub");
    expect(existsSync(join(root, "skills", "pipeshub", "SKILL.md"))).toBe(true);
  });

  test.skipIf(!Bun.which("claude"))("claude plugin validate accepts the plugin and lists the index command", () => {
    const r = spawnSync("claude", ["plugin", "validate", root], { encoding: "utf8", timeout: 120_000 });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain("commands: pipeshub:index");
    expect(r.stdout).toContain("commands: pipeshub:setup");
  });
});

/** One cmd.exe parse: a caret outside quotes escapes the next character. With `split`, also return the program token. */
function cmdPass(s: string, split: boolean): string | [string, string] {
  let out = "";
  let quoted = false;
  let program: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (!quoted && c === "^") { out += s[++i] ?? ""; continue; }
    if (c === '"') quoted = !quoted;
    // Unquoted, these would end the command or redirect it: the quoting failed.
    if (!quoted && "&|<>".includes(c)) throw new Error(`cmd.exe would act on ${c} at ${i} in: ${s}`);
    if (split && program === null && !quoted && c === " ") { program = out; out = ""; continue; }
    out += c;
  }
  return split ? [program ?? out, program === null ? "" : out] : out;
}

/** How a Windows program built with the MSVC runtime (node.exe) splits its command line. */
function msvcrtArgv(s: string): string[] {
  const argv: string[] = [];
  let cur = "";
  let quoted = false;
  let any = false;
  for (let i = 0; i < s.length;) {
    const c = s[i]!;
    if (c === "\\") {
      let n = 0;
      while (s[i + n] === "\\") n++;
      if (s[i + n] === '"') {
        cur += "\\".repeat(Math.floor(n / 2));
        if (n % 2) cur += '"';
        else { quoted = !quoted; any = true; }
        i += n + 1;
      } else { cur += "\\".repeat(n); i += n; }
      continue;
    }
    if (c === '"') { quoted = !quoted; any = true; i++; continue; }
    if ((c === " " || c === "\t") && !quoted) {
      if (cur || any) argv.push(cur);
      cur = ""; any = false; i++;
      continue;
    }
    cur += c; i++;
  }
  if (cur || any) argv.push(cur);
  return argv;
}
