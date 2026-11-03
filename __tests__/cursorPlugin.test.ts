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
  const dir = entry.source.replace(/^\.\//, "");
  expect(existsSync(join(root, dir, ".cursor-plugin/plugin.json"))).toBe(true);

  const plugin = json(`${dir}/.cursor-plugin/plugin.json`);
  const version = json("package.json").version;
  expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(plugin.name).toBe(entry.name);
  expect(plugin.version).toBe(version);
  expect(market.metadata.version).toBe(version);
  expect(existsSync(join(root, dir, plugin.logo))).toBe(true);

  const servers = json(`${dir}/mcp.json`).mcpServers;
  expect(Object.keys(servers)).toEqual(["pipeshub", "pipeshub-docs"]);

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
