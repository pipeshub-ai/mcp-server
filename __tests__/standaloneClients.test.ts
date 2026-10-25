import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLIENT_IDS, bridgeEntry, edit, targets, type ClientId, type Ctx, type Target } from "../src/cli/standalone/clients.js";

// One golden file per client file for "create", and one for "merge into a file
// that already has the person's own settings". Regenerate with UPDATE_GOLDEN=1
// and read the diff: the golden files ARE the formats the vendors document.

const GOLDEN = join(import.meta.dir, "golden", "standalone");
const ORIGIN = "http://127.0.0.1:3000";
const entry = bridgeEntry(ORIGIN);

function ctx(id: ClientId): Ctx {
  return { env: {}, home: "/home/u", platform: id === "claude-desktop" ? "darwin" : "linux", cwd: "/work/proj" };
}

function golden(name: string, actual: string) {
  const path = join(GOLDEN, name);
  if (process.env["UPDATE_GOLDEN"]) {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(path, actual);
  }
  expect(existsSync(path)).toBe(true);
  expect(actual).toBe(readFileSync(path, "utf8"));
}

const all: { id: ClientId; t: Target; n: number }[] = CLIENT_IDS.flatMap((id) =>
  targets(id, ctx(id), entry).map((t, n) => ({ id, t, n })));
const label = ({ id, t }: { id: ClientId; t: Target }) => `${id}: ${t.what}${t.project ? " (project)" : ""} ${t.file.split("/").slice(-2).join("/")}`;
const slug = ({ id, n }: { id: ClientId; n: number }) => `${id}.${n}`;

/** A file the person already has, in the shape this target edits. */
function existing(t: Target): string {
  if (t.kind === "json") {
    const root = t.path![0]!;
    return `{\n  // my settings\n  "theme": "dark",\n  "${root}": {\n    "other": { "command": "other-server", "args": ["--x"] } // keep\n  }\n}\n`;
  }
  if (t.kind === "toml") return 'model = "o3"\n\n[mcp_servers.other]\ncommand = "other-server"\nargs = ["--x"]\n';
  return "# My notes\n\nKeep this text.\n";
}

describe("every client has the targets the plan lists", () => {
  test("9 clients are covered and each has an MCP file", () => {
    expect([...CLIENT_IDS].sort()).toEqual(["claude-code", "claude-desktop", "cline", "codex", "cursor", "gemini", "vscode", "windsurf", "zed"]);
    for (const id of CLIENT_IDS) expect(targets(id, ctx(id), entry).some((t) => t.what === "mcp")).toBe(true);
  });

  test("Claude Desktop has no file on Linux, where it does not exist", () => {
    expect(targets("claude-desktop", { ...ctx("claude-desktop"), platform: "linux" }, entry)).toEqual([]);
  });
});

describe("Windsurf keeps both config locations it has used", () => {
  const home = "/home/u";
  const files = (c: Ctx) => targets("windsurf", c, entry).filter((t) => t.what === "mcp").map((t) => t.file);

  test("the vendor's current path is the primary one; the old path only where the person already has it", () => {
    expect(files(ctx("windsurf"))).toEqual([join(home, ".config", "devin", "mcp_config.json")]);
    const base = join(tmpdir(), "ws-legacy-" + process.pid);
    mkdirSync(join(base, ".codeium", "windsurf"), { recursive: true });
    expect(files({ ...ctx("windsurf"), home: base })).toEqual([join(base, ".config", "devin", "mcp_config.json"), join(base, ".codeium", "windsurf", "mcp_config.json")]);
  });
});

describe.each(all)("$id file $n", (c) => {
  const { t } = c;

  test(`${label(c)}: create matches the golden file`, () => {
    const r = edit(t, null, "add");
    expect(r.status).toBe("created");
    golden(`${slug(c)}.create`, r.after!);
  });

  test(`${label(c)}: re-running changes nothing`, () => {
    const once = edit(t, null, "add").after!;
    const again = edit(t, once, "add");
    expect(again.status).toBe("unchanged");
    expect(again.after).toBe(once);
  });

  test(`${label(c)}: uninstall deletes a file we created`, () => {
    const once = edit(t, null, "add").after!;
    const r = edit(t, once, "remove");
    expect(r.status).toBe("deleted");
    expect(r.after).toBeNull();
    expect(edit(t, null, "remove").status).toBe("absent");
  });

  if (t.kind !== "file") {
    test(`${label(c)}: merges into the person's own file, keeps it, and uninstall restores it`, () => {
      const before = existing(t);
      const r = edit(t, before, "add");
      expect(r.status).toBe("updated");
      expect(r.after).toContain((t.kind === "block" ? "Keep this text." : t.kind === "toml" ? 'model = "o3"' : "// my settings"));
      golden(`${slug(c)}.merge`, r.after!);
      const back = edit(t, r.after!, "remove");
      expect(back.status).toBe("removed");
      expect(back.after).toBe(before);
    });
  }

  test(`${label(c)}: a file that is not valid is left alone and reported`, () => {
    const bad = t.kind === "json" ? '{ "a": ' : t.kind === "toml" ? "[mcp_servers.x\ncommand = 1\n" : null;
    if (bad === null) return;
    const r = edit(t, bad, "add");
    expect(r.status).toBe("malformed");
    expect(r.after).toBe(bad);
    expect(edit(t, bad, "remove").status).toBe("malformed");
  });

  test(`${label(c)}: an existing entry with the same name that is not ours is kept unless --force`, () => {
    if (t.kind === "json") {
      const root = t.path![0]!;
      const theirs = `{\n  "${root}": {\n    "pipeshub": { "command": "my-own-bridge" }\n  }\n}\n`;
      const r = edit(t, theirs, "add");
      expect(r.status).toBe("conflict");
      expect(r.after).toBe(theirs);
      expect(edit(t, theirs, "remove").status).toBe("conflict");
      const forced = edit(t, theirs, "add", true);
      expect(forced.status).toBe("updated");
      expect(forced.after).not.toContain("my-own-bridge");
      expect(JSON.parse(forced.after!)[root].pipeshub.command).toBe("npx");
    } else if (t.kind === "toml") {
      const theirs = '[mcp_servers.pipeshub]\ncommand = "my-own-bridge"\n\n[mcp_servers.other]\ncommand = "o"\n';
      const r = edit(t, theirs, "add");
      expect(r.status).toBe("conflict");
      expect(r.after).toBe(theirs);
      const forced = edit(t, theirs, "add", true);
      expect(forced.after).not.toContain("my-own-bridge");
      expect(forced.after).toContain("[mcp_servers.other]");
      expect(forced.after).toContain("@pipeshub-ai/mcp");
    } else if (t.kind === "file") {
      const theirs = "---\ndescription: mine\n---\nMy own PipesHub rule.\n";
      expect(edit(t, theirs, "add").status).toBe("conflict");
      expect(edit(t, theirs, "remove").status).toBe("conflict");
      expect(edit(t, theirs, "add", true).status).toBe("updated");
    } else {
      // A block lives between its own markers: text around it is never "the same name".
      const r = edit(t, "## PipesHub\n\nmy own notes\n", "add");
      expect(r.after).toContain("my own notes");
    }
  });

  test(`${label(c)}: an entry from an older install (another origin) is updated without --force`, () => {
    if (t.kind !== "json") return;
    const root = t.path![0]!;
    const old = `{\n  "${root}": {\n    "pipeshub": { "command": "npx", "args": ["-y", "@pipeshub-ai/mcp@>=4.8.0", "start", "--server-url", "http://127.0.0.1:9999"] }\n  }\n}\n`;
    const r = edit(t, old, "add");
    expect(r.status).toBe("updated");
    expect(r.after).toContain(ORIGIN);
    expect(r.after).not.toContain("9999");
  });
});

describe("what is written", () => {
  test("no entry carries a credential: the bridge reads the CLI's own sign-in", () => {
    const written = all.map(({ t }) => edit(t, null, "add").after!).join("\n");
    expect(written).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(written).not.toMatch(/bearer/i);
    expect(written).not.toMatch(/PIPESHUB_(MCP_)?TOKEN|--bearer-auth|password|secret/i);
    expect(Object.keys(entry.env)).toEqual(["PIPESHUB_MCP_CHAT"]);
    expect(entry.env["PIPESHUB_MCP_CHAT"]).toBe("off");
  });

  test("the entry runs the stdio bridge for the given origin and no other command", () => {
    expect(entry.command).toBe("npx");
    expect(entry.args).toEqual(["-y", "@pipeshub-ai/mcp@>=4.8.0", "start", "--server-url", ORIGIN]);
    expect(bridgeEntry("http://127.0.0.1:64600").args.at(-1)).toBe("http://127.0.0.1:64600");
  });

  test("project files are marked project, user files are not", () => {
    for (const { t } of all) {
      if (t.what === "mcp") expect(t.project).toBe(false);
      if (t.what === "rules") expect(t.file.startsWith("/work/proj/")).toBe(true);
    }
  });
});
