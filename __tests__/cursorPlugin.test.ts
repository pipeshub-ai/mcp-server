import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p));
const frontmatter = (p: string) => {
  const m = /^---\n([\s\S]*?)\n---/.exec(read(p));
  expect(m, `${p} needs frontmatter`).not.toBeNull();
  return m![1]!;
};

test("cursor plugin matches the marketplace, package version and Cursor's validator essentials", () => {
  const market = json(".cursor-plugin/marketplace.json");
  const entry = market.plugins[0];
  // Cursor's reference uses a bare folder name for `source`.
  expect(entry.source).not.toMatch(/^\.\//);
  const dir = entry.source;
  expect(existsSync(join(root, dir, ".cursor-plugin/plugin.json"))).toBe(true);

  const plugin = json(`${dir}/.cursor-plugin/plugin.json`);
  const version = json("package.json").version;
  expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(plugin.name).toBe(entry.name);
  expect(plugin.version).toBe(version);
  expect(market.metadata.version).toBe(version);
  expect(existsSync(join(root, dir, plugin.logo))).toBe(true);
  // Cursor's schemas allow only name and email here (additionalProperties: false).
  for (const person of [plugin.author, market.owner]) {
    expect(Object.keys(person).every((k) => k === "name" || k === "email")).toBe(true);
  }

  const servers = json(`${dir}/mcp.json`).mcpServers;
  expect(Object.keys(servers)).toEqual(["pipeshub", "pipeshub-docs"]);
  // The plugin uses the remote server over OAuth (Cursor self-registers via DCR), so no
  // credential, command or token belongs in it.
  // The URL is asked for on install (no default), with <pipeshub-instanceurl>/mcp as the hint.
  expect(servers.pipeshub.url).toBe("${PIPESHUB_MCP_URL}");
  const vars = plugin.variables;
  expect(vars.type).toBe("object");
  expect(vars.required).toEqual(["PIPESHUB_MCP_URL"]);
  expect(vars.properties.PIPESHUB_MCP_URL.default).toBeUndefined();
  expect(vars.properties.PIPESHUB_MCP_URL.description).toContain("<pipeshub-instanceurl>/mcp");
  // Cursor accepts only these JSON Schema keywords in `variables`.
  const allowed = new Set(["type", "title", "description", "default", "enum", "const", "properties", "required", "items"]);
  for (const prop of Object.values(vars.properties) as Record<string, unknown>[]) {
    for (const k of Object.keys(prop)) expect(allowed.has(k), k).toBe(true);
  }
  // Every ${VAR} in mcp.json is a declared variable (Cursor does not expand ${env:...} here).
  for (const [, name] of JSON.stringify(servers).matchAll(/\$\{([^}]+)\}/g)) {
    expect(Object.keys(vars.properties)).toContain(name);
  }
  expect(servers.pipeshub.command).toBeUndefined();
  expect(JSON.stringify(servers)).not.toMatch(/token|bearer|authorization/i);

  const files = [
    ...readdirSync(join(root, dir, "commands")).map((f) => `${dir}/commands/${f}`),
    ...readdirSync(join(root, dir, "skills")).map((d) => `${dir}/skills/${d}/SKILL.md`),
  ];
  for (const f of files) {
    const fm = frontmatter(f);
    expect(fm, f).toMatch(/^name: \S/m);
    expect(fm, f).toMatch(/^description: \S/m);
  }

  expect(read(`${dir}/skills/pipeshub/SKILL.md`)).toBe(read("skills/pipeshub/SKILL.md"));
});
