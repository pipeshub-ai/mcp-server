import { describe, expect, test } from "bun:test";
import { CLIENT_IDS, bridgeEntry, targets, type ClientId } from "../src/cli/standalone/clients.js";
import { blockBody, commandFile } from "../src/cli/standalone/assets.js";

// What the agent is told (the golden files in golden/standalone hold the exact text per client).
// These tests hold what must stay true of it: small, names only real tools, tells the agent the
// four things, and says nothing internal.

const CODE_TOOLS = ["repos", "symbols", "neighbours", "read", "path", "search", "outline", "impact", "entry_points"].map((n) => `pipeshub_code_${n}`);
const REAL_TOOLS = new Set([...CODE_TOOLS, "pipeshub_search", "pipeshub_get_record_content", "index_workspace"]);
const ctx = (id: ClientId) => ({ env: {}, home: "/home/u", platform: (id === "claude-desktop" ? "darwin" : "linux") as NodeJS.Platform, cwd: "/work/proj" });
const entry = bridgeEntry("http://127.0.0.1:3000");

// Always-on text costs context on every turn: about 4 characters a token, so 1,800 is about 450 tokens.
const SKILL_BUDGET_CHARS = 1800;
const COMMAND_BUDGET_CHARS = 600;

const texts = CLIENT_IDS.flatMap((id) =>
  targets(id, ctx(id), entry).filter((t) => t.what !== "mcp").map((t) => ({ id, what: t.what, file: t.file, text: t.text! })));

describe("skill and rule text", () => {
  test("every client but Claude Desktop (no instruction channel) gets one", () => {
    const withText = new Set(texts.map((t) => t.id));
    expect([...CLIENT_IDS].filter((id) => !withText.has(id))).toEqual(["claude-desktop"]);
  });

  test.each(texts.filter((t) => t.what !== "command"))("$id $what stays inside the size budget ($file)", (t) => {
    expect(t.text.length).toBeLessThanOrEqual(SKILL_BUDGET_CHARS);
  });

  test.each(texts.filter((t) => t.what === "command"))("$id command stays inside the size budget ($file)", (t) => {
    expect(t.text.length).toBeLessThanOrEqual(COMMAND_BUDGET_CHARS);
  });

  test("the shared body teaches: when to use the code tools, index first, cite, keep calls small", () => {
    const b = blockBody();
    for (const tool of ["pipeshub_code_neighbours", "pipeshub_code_impact", "pipeshub_code_search", "pipeshub_code_symbols", "pipeshub_code_outline", "pipeshub_code_read", "pipeshub_code_entry_points"]) {
      expect(b).toContain(tool);
    }
    expect(b).toContain("index_workspace");
    expect(b).toMatch(/not indexed|changed a lot/);
    expect(b).toMatch(/Cite/);
    expect(b).toMatch(/Keep calls small/);
    expect(b).toContain("pipeshub_search");
  });

  test("it names only tools that exist (a typo would send the agent to a tool that is not there)", () => {
    for (const { text } of texts) {
      for (const name of text.match(/\b(?:pipeshub_[a-z_]+|index_workspace)\b/g) ?? []) {
        if (name === "pipeshub_code_") continue; // the `pipeshub_code_*` family
        expect(REAL_TOOLS.has(name)).toBe(true);
      }
    }
  });

  test("it says nothing internal, and no secret", () => {
    for (const { text } of texts) expect(text).not.toMatch(/\b(QA|enterprise|tenant|bearer|token)\b/i);
  });
});

describe("slash commands", () => {
  test("Claude Code and Gemini CLI get /pipeshub-index and /pipeshub-code in the user's home", () => {
    const files = (id: ClientId) => targets(id, ctx(id), entry).filter((t) => t.what === "command").map((t) => t.file);
    expect(files("claude-code")).toEqual(["/home/u/.claude/commands/pipeshub-index.md", "/home/u/.claude/commands/pipeshub-code.md"]);
    expect(files("gemini")).toEqual(["/home/u/.gemini/commands/pipeshub/index.toml", "/home/u/.gemini/commands/pipeshub/code.toml"]);
    for (const id of CLIENT_IDS.filter((i) => i !== "claude-code" && i !== "gemini")) expect(files(id)).toEqual([]);
  });

  test("the question reaches the prompt through each client's own placeholder", () => {
    expect(commandFile("claude-code", "code")).toContain("$ARGUMENTS");
    expect(commandFile("gemini", "code")).toContain("{{args}}");
    expect(commandFile("claude-code", "index")).not.toContain("$ARGUMENTS");
  });

  test("the Gemini file is valid TOML with a description and a prompt", () => {
    for (const n of ["index", "code"] as const) {
      const toml = commandFile("gemini", n);
      expect(toml).toMatch(/^# .*\ndescription = ".+"\nprompt = ".+"\n$/s);
      expect(() => JSON.parse(toml.split("prompt = ")[1]!)).not.toThrow(); // TOML basic string == JSON string here
    }
  });

  test("a command file starts with front matter at byte 0 (Claude Code reads it from there)", () => {
    expect(commandFile("claude-code", "code").startsWith("---\ndescription: ")).toBe(true);
  });
});
