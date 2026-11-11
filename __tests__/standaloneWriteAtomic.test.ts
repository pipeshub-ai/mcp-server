import { afterAll, beforeAll, expect, test } from "bun:test";
import { lstat, mkdtemp, readFile, rm, stat, symlink, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomic } from "../src/cli/standalone/init.js";

let dir: string;
beforeAll(async () => { dir = await mkdtemp(join(tmpdir(), "standalone-atomic-")); });
afterAll(async () => { await rm(dir, { recursive: true, force: true }); });

test("an existing file keeps its mode", async () => {
  const f = join(dir, "private.json");
  await writeFile(f, "old");
  await chmod(f, 0o600);
  await writeAtomic(f, "new");
  expect(await readFile(f, "utf8")).toBe("new");
  expect((await stat(f)).mode & 0o777).toBe(0o600);
});

test("a symlink is written through and stays a symlink", async () => {
  const real = join(dir, "real.toml");
  const link = join(dir, "link.toml");
  await writeFile(real, "old");
  await symlink(real, link);
  await writeAtomic(link, "new");
  expect((await lstat(link)).isSymbolicLink()).toBe(true);
  expect(await readFile(real, "utf8")).toBe("new");
});
