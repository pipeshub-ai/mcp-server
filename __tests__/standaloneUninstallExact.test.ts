import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bridgeEntry, edit, type Target } from "../src/cli/standalone/clients.js";
import { startFakeLocal } from "./helpers/fakeLocalPipeshub.js";

// Uninstall must give the person's file back byte for byte even after their client rewrote part of it
// since init (Claude Code rewrites ~/.claude.json on every start): expected = the same edit on the original.

const entry = bridgeEntry("http://127.0.0.1:3000");
const json = (path: string[]): Target => ({ client: "cursor", file: "/x/mcp.json", kind: "json", path, entry, what: "mcp", project: false });

interface Shape { name: string; path: string[]; original: string; clientEdit: [string, string]; hint?: { parentExisted: boolean } }
const SHAPES: Shape[] = [
  { name: "compact JSON", path: ["mcpServers", "pipeshub"], original: '{"mcpServers":{"other":{"command":"echo"}},"theme":"dark"}', clientEdit: ['"dark"', '"light"'], hint: { parentExisted: true } },
  { name: "compact JSON with spaces", path: ["mcpServers", "pipeshub"], original: '{ "mcpServers": { "other": { "command": "echo" } }, "theme": "dark" }', clientEdit: ['"dark"', '"light"'], hint: { parentExisted: true } },
  { name: "CRLF and tabs", path: ["mcpServers", "pipeshub"], original: '{\r\n\t"theme": "dark",\r\n\t"mcpServers": {\r\n\t\t"other": { "command": "echo" }\r\n\t}\r\n}\r\n', clientEdit: ['"dark"', '"light"'], hint: { parentExisted: true } },
  { name: "an empty mcpServers", path: ["mcpServers", "pipeshub"], original: '{"theme":"dark","mcpServers":{}}', clientEdit: ['"dark"', '"light"'], hint: { parentExisted: true } },
  { name: "JSONC with trailing commas and comments", path: ["context_servers", "pipeshub"], original: '// Zed\n{\n  "vim_mode": true, // yes\n  "theme": "dark",\n}\n', clientEdit: ['"dark"', '"light"'] },
  { name: "JSONC, parent present with a trailing comma", path: ["context_servers", "pipeshub"], original: '{\n  "context_servers": {\n    "other": { "command": "echo" }, // mine\n  },\n  "theme": "dark",\n}\n', clientEdit: ['"dark"', '"light"'], hint: { parentExisted: true } },
  { name: "pretty JSON, parent created by init", path: ["mcpServers", "pipeshub"], original: '{\n  "theme": "dark"\n}\n', clientEdit: ['"dark"', '"light"'] },
];

describe.each(SHAPES)("$name", (s) => {
  test("init, a client edit, uninstall = the original with the same client edit", () => {
    const added = edit(json(s.path), s.original, "add");
    expect(added.after).not.toBeNull();
    const touched = added.after!.replace(...s.clientEdit);
    expect(touched).not.toBe(added.after);
    const removed = edit(json(s.path), touched, "remove", false, s.hint);
    expect(removed.after).toBe(s.original.replace(...s.clientEdit));
  });

  test("uninstall right after init is the original", () => {
    const added = edit(json(s.path), s.original, "add");
    expect(edit(json(s.path), added.after, "remove", false, s.hint).after).toBe(s.original);
  });
});

describe("through init and uninstall with the person's client rewriting its file in between", () => {
  const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
  test("an empty servers object and CRLF come back exactly", async () => {
    const fake = startFakeLocal();
    const root = await mkdtemp(join(tmpdir(), "l9i-exact-"));
    try {
      const home = join(root, "home");
      const cwd = join(root, "proj");
      await mkdir(join(home, ".codeium/windsurf"), { recursive: true });
      await mkdir(join(home, ".gemini"), { recursive: true });
      await mkdir(cwd, { recursive: true });
      const a = '{"theme":"dark","mcpServers":{}}';
      const b = '{\r\n\t"theme": "dark"\r\n}\r\n';
      await writeFile(join(home, ".codeium/windsurf/mcp_config.json"), a);
      await writeFile(join(home, ".gemini/settings.json"), b);
      // async: the fake server lives in this process, so a blocking spawn would starve it
      const port = new URL(fake.origin).port;
      await mkdir(join(home, ".pipeshub", "standalone"), { recursive: true });
      await writeFile(join(home, ".pipeshub", "standalone", "state.json"), JSON.stringify({ project: "t", port: Number(port), origin: fake.origin }));
      await writeFile(join(root, "docker-shim"), `#!/bin/sh\ncase "$*" in *" port "*) echo "127.0.0.1:${port}" ;; esac\nexit 0\n`, { mode: 0o755 });
      const run = async (args: string[]) => {
        const p = Bun.spawn([process.execPath, ENTRY, ...args], { cwd, env: { PATH: "/usr/bin:/bin", HOME: home, PIPESHUB_DOCKER: join(root, "docker-shim"), GIT_CEILING_DIRECTORIES: root }, stdout: "pipe", stderr: "pipe" });
        await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
        return p.exited;
      };
      expect(await run(["init", "--yes", "--url", fake.origin])).toBe(0);
      for (const f of [join(home, ".codeium/windsurf/mcp_config.json"), join(home, ".gemini/settings.json")]) {
        await writeFile(f, (await readFile(f, "utf8")).replace('"dark"', '"light"')); // the client rewrites a value
      }
      expect(await run(["uninstall"])).toBe(0);
      expect(await readFile(join(home, ".codeium/windsurf/mcp_config.json"), "utf8")).toBe(a.replace("dark", "light"));
      expect(await readFile(join(home, ".gemini/settings.json"), "utf8")).toBe(b.replace("dark", "light"));
    } finally {
      fake.stop();
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
