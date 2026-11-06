// Per-client MCP config and instruction files, as pure edits: each function
// takes the file's current text (or null) and returns the new text, so the
// same code serves --dry-run, the real write, and the golden-file tests. The
// caller does the reading, backing up and writing (init.ts).
//
// No entry written here carries a secret. It runs the stdio bridge, which reads
// the sign-in `pipeshub init` stored in the CLI's own credential file.

import { delimiter, join } from "node:path";
import { existsSync } from "node:fs";
import { BLOCK_BEGIN, BLOCK_END, OWNED, blockBody, commandFile, ruleFile } from "./assets.js";
import { JsoncError, getAt, removeAt, setAt } from "./jsonc.js";

export const CLIENT_IDS = [
  "claude-code", "codex", "claude-desktop", "cursor", "windsurf", "vscode", "gemini", "zed", "cline",
] as const;
export type ClientId = (typeof CLIENT_IDS)[number];

/** The first @pipeshub-ai/mcp release whose stdio `start` is the bridge: a proxy of the instance's /mcp with index_workspace (4.7 to 4.9 have neither). npx reuses any cached version in range, so the floor must be a release that has it. */
export const BRIDGE_PACKAGE = "@pipeshub-ai/mcp@>=4.10.0";

export interface McpEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * The one place that decides what a client runs. The stdio bridge becomes a
 * proxy to the server's full tool set in a later release of the same package,
 * so this entry does not change when it does. Chat is off for coding clients:
 * search-and-read is as accurate and cheaper (TOOLS.md).
 */
export function bridgeEntry(origin: string): McpEntry {
  return {
    command: "npx",
    args: ["-y", BRIDGE_PACKAGE, "start", "--server-url", origin],
    env: { PIPESHUB_MCP_CHAT: "off" },
  };
}

export interface Ctx {
  env: NodeJS.ProcessEnv;
  home: string;
  platform: NodeJS.Platform;
  cwd: string;
}

export type TargetKind = "json" | "toml" | "block" | "file";

export interface Target {
  client: ClientId;
  file: string;
  kind: TargetKind;
  /** json: the member path holding the server, e.g. ["mcpServers", "pipeshub"]. */
  path?: string[];
  /** json/toml: the client's own entry shape. */
  entry?: object;
  /** block/file: the text to write. */
  text?: string;
  /** What this file is, for the report. */
  what: "mcp" | "skill" | "rules" | "command";
  /** Lives in the working directory's project (opt-in), not in the user's home. */
  project: boolean;
}

export interface Edit {
  status: "created" | "updated" | "unchanged" | "removed" | "deleted" | "absent" | "conflict" | "malformed";
  /** New content; null = the file is removed. Equal to the input when nothing changes. */
  after: string | null;
  note?: string;
}

const NAME = "pipeshub";

// ---------- where each client keeps things ----------

function appData(c: Ctx): string {
  return c.env["APPDATA"] || join(c.home, "AppData", "Roaming");
}

/** The VS Code user directory (VS Code's own MCP file and Cline's storage live in it). */
function vscodeUser(c: Ctx): string {
  if (c.platform === "darwin") return join(c.home, "Library", "Application Support", "Code", "User");
  if (c.platform === "win32") return join(appData(c), "Code", "User");
  return join(c.env["XDG_CONFIG_HOME"] || join(c.home, ".config"), "Code", "User");
}

const codexHome = (c: Ctx) => c.env["CODEX_HOME"] || join(c.home, ".codex");
const zedSettings = (c: Ctx) =>
  c.platform === "win32" ? join(appData(c), "Zed", "settings.json") : join(c.env["XDG_CONFIG_HOME"] || join(c.home, ".config"), "zed", "settings.json");
const desktopConfig = (c: Ctx): string | null =>
  c.platform === "darwin" ? join(c.home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
    : c.platform === "win32" ? join(appData(c), "Claude", "claude_desktop_config.json")
    : null;
const clineSettings = (c: Ctx) =>
  join(vscodeUser(c), "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json");

function onPath(binary: string, c: Ctx): boolean {
  const exts = c.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  return (c.env["PATH"] ?? "").split(delimiter).filter(Boolean)
    .some((dir) => exts.some((e) => existsSync(join(dir, binary + e))));
}

/** A client counts as installed when its binary is on PATH or its config directory exists. */
export function detect(id: ClientId, c: Ctx): boolean {
  const dir = (...p: string[]) => existsSync(join(c.home, ...p));
  switch (id) {
    case "claude-code": return onPath("claude", c) || dir(".claude") || dir(".claude.json");
    case "codex": return onPath("codex", c) || existsSync(codexHome(c));
    case "claude-desktop": { const f = desktopConfig(c); return f !== null && existsSync(join(f, ".."));  }
    case "cursor": return onPath("cursor", c) || dir(".cursor");
    case "windsurf": return onPath("windsurf", c) || dir(".codeium", "windsurf") || dir(".config", "devin");
    case "vscode": return onPath("code", c) || existsSync(vscodeUser(c));
    case "gemini": return onPath("gemini", c) || dir(".gemini");
    case "zed": return onPath("zed", c) || existsSync(join(zedSettings(c), ".."));
    case "cline": return existsSync(join(clineSettings(c), "..", ".."));
  }
}

export const LABEL: Record<ClientId, string> = {
  "claude-code": "Claude Code", codex: "Codex", "claude-desktop": "Claude Desktop", cursor: "Cursor",
  windsurf: "Windsurf", vscode: "VS Code", gemini: "Gemini CLI", zed: "Zed", cline: "Cline",
};

/**
 * Every file `init` writes for a client. Formats are the vendors' documented
 * ones:
 *  - Claude Code  https://code.claude.com/docs/en/mcp (user scope = `mcpServers` in ~/.claude.json),
 *                 https://code.claude.com/docs/en/skills (~/.claude/skills/<name>/SKILL.md), CLAUDE.md memory
 *  - Codex        https://developers.openai.com/codex/mcp (`[mcp_servers.<name>]` in ~/.codex/config.toml),
 *                 https://developers.openai.com/codex/guides/agents-md (~/.codex/AGENTS.md, ./AGENTS.md)
 *  - Claude Desktop  https://modelcontextprotocol.io/quickstart/user (`mcpServers` in claude_desktop_config.json)
 *  - Cursor       https://cursor.com/docs/context/mcp (~/.cursor/mcp.json), https://cursor.com/docs/context/rules (.cursor/rules/*.mdc)
 *  - Windsurf     https://docs.windsurf.com/windsurf/cascade/mcp -> docs.devin.ai/desktop/cascade/mcp (~/.config/devin/mcp_config.json; the older
 *                 ~/.codeium/windsurf/mcp_config.json is kept up to date where it exists),
 *                 https://docs.windsurf.com/windsurf/cascade/memories (.windsurf/rules/*.md)
 *  - VS Code      https://code.visualstudio.com/docs/copilot/customization/mcp-servers (`servers` in the user mcp.json),
 *                 https://code.visualstudio.com/docs/copilot/customization/custom-instructions (.github/instructions/*.instructions.md)
 *  - Gemini CLI   https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md (`mcpServers` in ~/.gemini/settings.json),
 *                 https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md (~/.gemini/GEMINI.md)
 *  - Zed          https://zed.dev/docs/ai/mcp (`context_servers` in settings.json), https://zed.dev/docs/ai/rules (.rules)
 *  - Cline        https://docs.cline.bot/mcp/configuring-mcp-servers (cline_mcp_settings.json),
 *                 https://docs.cline.bot/features/cline-rules (.clinerules/)
 * Project files (rules in the repository) are returned with project: true; the
 * caller writes them only when the person opted in.
 */
export function targets(id: ClientId, c: Ctx, entry: McpEntry): Target[] {
  const std = { command: entry.command, args: entry.args, env: entry.env };
  const json = (file: string, root: string, shape: object): Target =>
    ({ client: id, file, kind: "json", path: [root, NAME], entry: shape, what: "mcp", project: false });
  const proj = (rel: string, kind: "block" | "file", text: string, p = true): Target =>
    ({ client: id, file: join(c.cwd, rel), kind, text, what: "rules", project: p });
  switch (id) {
    case "claude-code":
      return [
        json(join(c.home, ".claude.json"), "mcpServers", { type: "stdio", ...std }),
        { client: id, file: join(c.home, ".claude", "skills", NAME, "SKILL.md"), kind: "file", text: ruleFile("skill"), what: "skill", project: false },
        ...(["index", "code"] as const).map((n): Target => ({ client: id, file: join(c.home, ".claude", "commands", `pipeshub-${n}.md`), kind: "file", text: commandFile("claude-code", n), what: "command", project: false })),
        proj("CLAUDE.md", "block", blockBody()),
      ];
    case "codex":
      return [
        { client: id, file: join(codexHome(c), "config.toml"), kind: "toml", entry: std, what: "mcp", project: false },
        { client: id, file: join(codexHome(c), "AGENTS.md"), kind: "block", text: blockBody(), what: "skill", project: false },
        proj("AGENTS.md", "block", blockBody()),
      ];
    case "claude-desktop": {
      const f = desktopConfig(c);
      return f === null ? [] : [json(f, "mcpServers", std)];
    }
    case "cursor":
      return [json(join(c.home, ".cursor", "mcp.json"), "mcpServers", std), proj(join(".cursor", "rules", "pipeshub.mdc"), "file", ruleFile("cursor"))];
    case "windsurf": {
      // The vendor's current doc (docs.devin.ai/desktop/cascade/mcp) names ~/.config/devin; older installs read ~/.codeium/windsurf, so that file
      // is kept up to date too where it already exists.
      const legacy = join(c.home, ".codeium", "windsurf");
      return [
        json(join(c.home, ".config", "devin", "mcp_config.json"), "mcpServers", std),
        ...(existsSync(legacy) ? [json(join(legacy, "mcp_config.json"), "mcpServers", std)] : []),
        proj(join(".windsurf", "rules", "pipeshub.md"), "file", ruleFile("windsurf")),
      ];
    }
    case "vscode":
      return [
        json(join(vscodeUser(c), "mcp.json"), "servers", { type: "stdio", ...std }),
        proj(join(".github", "instructions", "pipeshub.instructions.md"), "file", ruleFile("vscode")),
      ];
    case "gemini":
      return [
        json(join(c.home, ".gemini", "settings.json"), "mcpServers", std),
        { client: id, file: join(c.home, ".gemini", "GEMINI.md"), kind: "block", text: blockBody(), what: "skill", project: false },
        ...(["index", "code"] as const).map((n): Target => ({ client: id, file: join(c.home, ".gemini", "commands", "pipeshub", `${n}.toml`), kind: "file", text: commandFile("gemini", n), what: "command", project: false })),
      ];
    case "zed":
      return [json(zedSettings(c), "context_servers", { source: "custom", ...std }), proj(".rules", "block", blockBody())];
    case "cline":
      return [
        json(clineSettings(c), "mcpServers", { ...std, disabled: false, autoApprove: [] }),
        proj(join(".clinerules", "pipeshub.md"), "file", ruleFile("cline")),
      ];
  }
}

// ---------- pure edits ----------

const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as object).sort(([a], [b]) => a.localeCompare(b)))
      : x);
const same = (a: unknown, b: unknown) => canon(a) === canon(b);
/** An entry that looks like one of ours (an older install, another port): the bridge on a loopback origin, with no token in its arguments. Safe to update without --force. */
const looksOurs = (v: unknown) => {
  const args = (v as { args?: unknown } | null)?.args;
  if (!Array.isArray(args) || !args.some((a) => typeof a === "string" && a.includes("@pipeshub-ai/")) || args.includes("--bearer-auth")) return false;
  const url = args[args.indexOf("--server-url") + 1];
  try {
    return typeof url === "string" && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

function editJson(t: Target, before: string | null, mode: "add" | "remove", force: boolean, hint?: EditHint): Edit {
  const path = t.path!;
  let current: unknown;
  try {
    current = before === null ? undefined : getAt(before, path);
  } catch (e) {
    if (e instanceof JsoncError) return { status: "malformed", after: before, note: `not valid JSON (${e.message}); fix or move it, then run this again` };
    throw e;
  }
  if (mode === "remove") {
    if (before === null || current === undefined) return { status: "absent", after: before };
    if (!looksOurs(current) && !force) return { status: "conflict", after: before, note: `"${path.join(".")}" is not a PipesHub entry; left as is` };
    const after = removeAt(before, path, { keepParent: hint?.parentExisted === true });
    return after.replace(/\s/g, "") === "{}" ? { status: "deleted", after: null } : { status: "removed", after };
  }
  if (current !== undefined && same(current, t.entry)) return { status: "unchanged", after: before };
  if (current !== undefined && !looksOurs(current) && !force) {
    return { status: "conflict", after: before, note: `already has a "${NAME}" entry that is not PipesHub's; left as is (use --force to replace)` };
  }
  try {
    return { status: before === null ? "created" : "updated", after: setAt(before ?? "", path, t.entry) };
  } catch (e) {
    if (e instanceof JsoncError) return { status: "malformed", after: before, note: `cannot edit (${e.message})` };
    throw e;
  }
}

// -- TOML (Codex): a managed block, so only our lines are ever touched --
const TOML_BEGIN = "# >>> pipeshub (managed by pipeshub init) >>>";
const TOML_END = "# <<< pipeshub <<<";
const q = (s: string) => JSON.stringify(s);

function tomlBlock(entry: McpEntry): string {
  const env = Object.entries(entry.env).map(([k, v]) => `${k} = ${q(v)}`).join("\n");
  return [
    TOML_BEGIN,
    `[mcp_servers.${NAME}]`,
    `command = ${q(entry.command)}`,
    `args = [${entry.args.map(q).join(", ")}]`,
    ...(env ? ["", `[mcp_servers.${NAME}.env]`, env] : []),
    TOML_END,
  ].join("\n") + "\n";
}

const OWN_TABLE = new RegExp(`^\\s*\\[\\s*mcp_servers\\s*\\.\\s*("${NAME}"|'${NAME}'|${NAME})\\s*(\\.[^\\]]*)?\\]`, "m");

// shortcut: a header/triple-quote sanity check, not a TOML parser; upgrade if a real file slips through it.
function tomlLooksBroken(text: string): string | null {
  if ((text.match(/"""/g) ?? []).length % 2 === 1) return "an unterminated multi-line string";
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (l.startsWith("[") && !/^\[\[?[^\][]+\]\]?\s*(#.*)?$/.test(l) && !/^\[.*\]\s*(#.*)?$/.test(l)) return `a bad table header: ${l.slice(0, 40)}`;
  }
  return null;
}

/** Drop every `[mcp_servers.pipeshub...]` table (up to the next header). */
function dropOwnTables(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^\s*\[/.test(line)) skipping = OWN_TABLE.test(line);
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

function editToml(t: Target, before: string | null, mode: "add" | "remove", force: boolean): Edit {
  const text = before ?? "";
  const broken = tomlLooksBroken(text);
  if (broken) return { status: "malformed", after: before, note: `not valid TOML (${broken}); fix or move it, then run this again` };
  const b = text.indexOf(TOML_BEGIN);
  const e = text.indexOf(TOML_END);
  const hasBlock = b >= 0 && e > b;
  const withoutBlock = hasBlock ? text.slice(0, b) + text.slice(e + TOML_END.length).replace(/^\n/, "") : text;
  const foreign = OWN_TABLE.test(withoutBlock);
  if (mode === "remove") {
    if (!hasBlock && !(foreign && force)) return foreign
      ? { status: "conflict", after: before, note: `"${NAME}" is not one of ours; left as is` }
      : { status: "absent", after: before };
    const rest = (foreign && force ? dropOwnTables(withoutBlock) : withoutBlock).replace(/\n{3,}/g, "\n\n");
    return rest.trim() === "" ? { status: "deleted", after: null } : { status: "removed", after: rest.replace(/\s+$/, "") + "\n" };
  }
  const block = tomlBlock(t.entry as McpEntry);
  if (foreign && !force) {
    return { status: "conflict", after: before, note: `already has [mcp_servers.${NAME}] that pipeshub did not write; left as is (use --force to replace)` };
  }
  const base = foreign ? dropOwnTables(withoutBlock) : withoutBlock;
  const place = hasBlock && !foreign ? b : -1;
  const next = place >= 0
    ? text.slice(0, b) + block + text.slice(e + TOML_END.length).replace(/^\n/, "")
    : (base.trim() === "" ? "" : base.replace(/\s+$/, "") + "\n\n") + block;
  if (next === text) return { status: "unchanged", after: before };
  return { status: before === null ? "created" : "updated", after: next };
}

// -- markdown block inside a file the person owns (AGENTS.md ...) --
function editBlock(t: Target, before: string | null, mode: "add" | "remove"): Edit {
  const text = before ?? "";
  const b = text.indexOf(BLOCK_BEGIN);
  const e = text.indexOf(BLOCK_END);
  const has = b >= 0 && e > b;
  if (mode === "remove") {
    if (!has) return { status: "absent", after: before };
    const rest = (text.slice(0, b).replace(/\n+$/, "\n") + text.slice(e + BLOCK_END.length).replace(/^\n+/, "")).replace(/^\n+/, "");
    return rest.trim() === "" ? { status: "deleted", after: null } : { status: "removed", after: rest };
  }
  const block = `${BLOCK_BEGIN}\n${t.text}\n${BLOCK_END}\n`;
  let next: string;
  if (has) next = text.slice(0, b) + block + text.slice(e + BLOCK_END.length).replace(/^\n/, "");
  else next = text.trim() === "" ? block : text.replace(/\s+$/, "") + "\n\n" + block;
  if (next === text) return { status: "unchanged", after: before };
  return { status: before === null ? "created" : "updated", after: next };
}

// -- a whole file that is ours --
function editFile(t: Target, before: string | null, mode: "add" | "remove", force: boolean): Edit {
  if (mode === "remove") {
    if (before === null) return { status: "absent", after: before };
    if (!before.includes(OWNED) && !force) return { status: "conflict", after: before, note: "not written by pipeshub; left as is" };
    return { status: "deleted", after: null };
  }
  if (before === t.text) return { status: "unchanged", after: before };
  if (before !== null && !before.includes(OWNED) && !force) {
    return { status: "conflict", after: before, note: "exists and was not written by pipeshub; left as is (use --force to replace)" };
  }
  return { status: before === null ? "created" : "updated", after: t.text! };
}

/** What init recorded about the file before it touched it. */
export interface EditHint {
  /** The object our entry sits in was already in the person's file, so removing the entry must leave it. */
  parentExisted?: boolean;
}

export function edit(t: Target, before: string | null, mode: "add" | "remove", force = false, hint?: EditHint): Edit {
  switch (t.kind) {
    case "json": return editJson(t, before, mode, force, hint);
    case "toml": return editToml(t, before, mode, force);
    case "block": return editBlock(t, before, mode);
    case "file": return editFile(t, before, mode, force);
  }
}
