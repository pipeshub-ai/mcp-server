import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// `pipeshub index` against a fake of the local-repos API (handoffs/L9-C-api.md):
// only git-listed text files are sent, only what the server lacks is uploaded,
// a second run sends nothing, and a deleted file is removed on the server.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
let root: string;
let fake: FakeLocal;
let repo: string;
let home: string;

const git = (...a: string[]) => {
  const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: repo, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};

async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    cwd: repo,
    env: { PATH: "/usr/bin:/bin", HOME: home, PIPESHUB_BASE_URL: fake.origin, PIPESHUB_TOKEN: fake.issuedToken, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, stdout, stderr };
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "l9a-index-"));
  repo = join(root, "my-repo");
  home = join(root, "home");
  await mkdir(join(repo, "src"), { recursive: true });
  fake = startFakeLocal({ orgExists: true });
  fake.mcp.tools = [{ name: "pipeshub_code_repos", inputSchema: { type: "object" } }];
  await writeFile(join(repo, "src", "a.py"), "def a():\n    return 1\n");
  await writeFile(join(repo, "src", "b.py"), "def b():\n    return 2\n");
  await writeFile(join(repo, "README.md"), "# Demo\n");
  await writeFile(join(repo, ".gitignore"), "secret.env\nbuild/\n");
  await writeFile(join(repo, "secret.env"), "TOKEN=do-not-send\n");
  await mkdir(join(repo, "build"));
  await writeFile(join(repo, "build", "out.js"), "ignored\n");
  await writeFile(join(repo, "logo.bin"), Buffer.from([0, 1, 2, 3, 0, 255]));
  await writeFile(join(repo, "latin1.txt"), Buffer.from([0x63, 0x61, 0x66, 0xe9]));
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "init");
  await writeFile(join(repo, "src", "untracked.py"), "def u():\n    pass\n"); // untracked, not ignored: sent
});
afterAll(async () => { fake.stop(); await rm(root, { recursive: true, force: true }); });

describe("pipeshub index", () => {
  test("sends tracked and untracked files that git does not ignore, skips binary and non-UTF-8 files, then commits", async () => {
    const r = await cli(["index"]);
    expect(r.code).toBe(0);
    expect(fake.repo.name).toBe("my-repo");
    expect([...fake.repo.files.keys()].sort()).toEqual([".gitignore", "README.md", "src/a.py", "src/b.py", "src/untracked.py"]);
    expect(fake.repo.commits).toBe(1);
    expect(JSON.parse(r.stdout).state).toBe("ready");
    // the repo id is kept inside .git so the same working copy is the same repo next time
    expect((await readFile(join(repo, ".git", "pipeshub-repo-id"), "utf8")).trim()).toMatch(/^[0-9a-f]{32}$/);
    expect([...fake.repo.files.values()].join("")).not.toContain("do-not-send");
  });

  test("a second run uploads nothing; a changed file uploads alone; a deleted file is removed on the server", async () => {
    const puts = () => fake.log.filter((l) => l.endsWith("/files")).length;
    const before = puts();
    expect(JSON.parse((await cli(["index"])).stdout).sent).toBe(0);
    expect(puts()).toBe(before);

    await writeFile(join(repo, "src", "a.py"), "def a():\n    return 100\n");
    expect(JSON.parse((await cli(["index"])).stdout).sent).toBe(1);
    expect(fake.repo.files.get("src/a.py")).toContain("100");

    await rm(join(repo, "src", "b.py"));
    await cli(["index"]);
    expect(fake.repo.deleted).toContain("src/b.py");
    expect(fake.repo.files.has("src/b.py")).toBe(false);
    expect(fake.repo.commits).toBe(4);
  });

  test("without a sign-in it says to run init, exit 3", async () => {
    const proc = Bun.spawn([process.execPath, ENTRY, "index"], { cwd: repo, env: { PATH: "/usr/bin:/bin", HOME: join(root, "nobody") }, stdout: "pipe", stderr: "pipe" });
    const [err, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    expect(code).toBe(3);
    expect(err).toContain("pipeshub init");
  });
});

describe("pipeshub index when the server does not finish", () => {
  const after = () => { fake.repo.status = null; fake.repo.error = null; };

  test("a sync that never starts ends with a clear message and exit 1, not an endless wait", async () => {
    fake.repo.status = "syncing";
    const t = Date.now();
    const r = await cli(["index"], { PIPESHUB_INDEX_START_SECONDS: "2" });
    after();
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("has not started syncing");
    expect(r.stderr).toContain("docker compose");
    expect(Date.now() - t).toBeLessThan(20_000);
  });

  test("a stuck status from the server is reported with the server's own message", async () => {
    fake.repo.status = "stuck";
    fake.repo.error = "the sync of this repository did not start; the files are stored.";
    const r = await cli(["index"]);
    after();
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("did not start");
  });

  test("an index that is still running when the wait ends is exit 1 and says it continues", async () => {
    fake.repo.status = "indexing";
    const r = await cli(["index"], { PIPESHUB_INDEX_WAIT_SECONDS: "2" });
    after();
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("still indexing after 2 s");
  });
});

describe("pipeshub index and the code tools", () => {
  test("waits for the code tools to be listed and says so", async () => {
    fake.mcp.tools = [];
    setTimeout(() => { fake.mcp.tools = [{ name: "pipeshub_code_repos", inputSchema: { type: "object" } }]; }, 3000);
    const r = await cli(["index"], { PIPESHUB_INDEX_TOOLS_SECONDS: "20" });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).codeTools).toBe(true);
    expect(r.stderr).toContain("code tools are available");
  });

  test("when they never appear it still succeeds and tells the person what to do", async () => {
    fake.mcp.tools = [];
    const r = await cli(["index"], { PIPESHUB_INDEX_TOOLS_SECONDS: "2" });
    fake.mcp.tools = [{ name: "pipeshub_code_repos", inputSchema: { type: "object" } }];
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).codeTools).toBe(false);
    expect(r.stderr).toContain("not listed yet");
  });
});
