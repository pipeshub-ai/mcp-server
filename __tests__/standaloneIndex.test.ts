import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";
import { unwatched } from "../src/cli/standalone/index.js";

// `pipeshub index` against a fake of the local-repos API (/api/v1/local-repos):
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
  root = await mkdtemp(join(tmpdir(), "standalone-index-"));
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

describe("pipeshub index on awkward repositories", () => {
  let dir: string;
  let f2: FakeLocal;
  let h2: string;
  const sh = (cwd: string, ...a: string[]) => {
    const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
  };
  async function run(args: string[], env: Record<string, string> = {}, cwd = dir) {
    const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
      cwd, env: { PATH: "/usr/bin:/bin", HOME: h2, PIPESHUB_BASE_URL: f2.origin, PIPESHUB_TOKEN: f2.issuedToken, GIT_CEILING_DIRECTORIES: root, ...env }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    return { code, stdout, stderr };
  }
  beforeEach(async () => {
    dir = await mkdtemp(join(root, "awk-"));
    h2 = join(dir, "..", "home-" + Math.random().toString(36).slice(2));
    f2 = startFakeLocal({ orgExists: true });
    f2.mcp.tools = [{ name: "pipeshub_code_repos", inputSchema: { type: "object" } }];
    sh(dir, "init", "-q");
  });
  afterEach(() => f2.stop());

  test("a file that starts with a UTF-8 byte-order mark arrives with its mark and is not dropped", async () => {
    await writeFile(join(dir, "bom.py"), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("x = 1\n")]));
    await writeFile(join(dir, "ok.py"), "y = 2\n");
    sh(dir, "add", "-A");
    const r = await run(["index"]);
    expect(r.code).toBe(0);
    expect([...f2.repo.files.keys()].sort()).toEqual(["bom.py", "ok.py"]);
    expect(f2.repo.files.get("bom.py")!.charCodeAt(0)).toBe(0xfeff);
  });

  test("files the server refuses are listed in the summary, not hidden", async () => {
    await writeFile(join(dir, "a.py"), "x = 1\n");
    sh(dir, "add", "-A");
    f2.repo.refuse = ["a.py"];
    const r = await run(["index"]);
    expect(JSON.parse(r.stdout).rejected).toEqual([{ path: "a.py", reason: "hash_mismatch" }]);
    expect(r.stderr).toContain("a.py");
  });

  test("a symlink is recorded as skipped and what it points at outside the repository is never read", async () => {
    const outside = join(root, "outside-secret.txt");
    await writeFile(outside, "SECRET_OUTSIDE_FILE_CONTENT\n");
    await writeFile(join(dir, "a.py"), "x = 1\n");
    await symlink(outside, join(dir, "link_out.txt"));
    await symlink("a.py", join(dir, "link_in.py"));
    sh(dir, "add", "-A");
    const r = await run(["index"]);
    expect(r.code).toBe(0);
    expect([...f2.repo.files.keys()]).toEqual(["a.py"]);
    expect([...f2.repo.files.values()].join("")).not.toContain("SECRET_OUTSIDE");
    expect(JSON.parse(r.stdout).skipped).toBe(2);
  });

  test("files that usually hold secrets are never sent, and the count is reported", async () => {
    await writeFile(join(dir, "a.py"), "x = 1\n");
    for (const n of [".env", ".env.local", "server.pem", "tls.key", "store.p12", "store.pfx", "id_rsa", "id_ed25519.pub", "vault.kdbx", "credentials.json"]) {
      await writeFile(join(dir, n), "TOP_SECRET_VALUE\n");
    }
    sh(dir, "add", "-A");
    const r = await run(["index"]);
    expect(r.code).toBe(0);
    expect([...f2.repo.files.keys()]).toEqual(["a.py"]);
    expect([...f2.repo.files.values()].join("")).not.toContain("TOP_SECRET_VALUE");
    expect(JSON.parse(r.stdout).secrets).toBe(10);
  });

  test("files under vendor/ and node_modules/ do not count toward the server's file limit", async () => {
    await mkdir(join(dir, "vendor", "x"), { recursive: true });
    await mkdir(join(dir, "node_modules", "y"), { recursive: true });
    for (let i = 0; i < 4; i++) await writeFile(join(dir, "vendor", "x", `v${i}.go`), "package x\n");
    for (let i = 0; i < 4; i++) await writeFile(join(dir, "node_modules", "y", `n${i}.js`), "x\n");
    for (let i = 0; i < 3; i++) await writeFile(join(dir, `m${i}.py`), `a = ${i}\n`);
    sh(dir, "add", "-A");
    f2.repo.maxManifestEntries = 5;
    const r = await run(["index"]);
    expect(r.code).toBe(0);
    expect([...f2.repo.files.keys()].sort()).toEqual(["m0.py", "m1.py", "m2.py"]);
  });

  test("source folders named like build output are indexed; dependency folders and top-level artifact folders are not", async () => {
    for (const d of ["internal/build", "cmd/out", "lib/env", "pkg/dist", "node_modules/x", "vendor/m", "dist"]) {
      await mkdir(join(dir, d), { recursive: true });
      await writeFile(join(dir, d, "f.go"), `package f // ${d}\n`);
    }
    sh(dir, "add", "-A");
    const r = await run(["index"]);
    expect(r.code).toBe(0);
    expect([...f2.repo.files.keys()].sort()).toEqual(["cmd/out/f.go", "internal/build/f.go", "lib/env/f.go", "pkg/dist/f.go"]);
    expect(JSON.parse(r.stdout).ignored).toBe(3);
  });

  test("the wait is in seconds, whatever the server's own speed", async () => {
    await writeFile(join(dir, "a.py"), "x = 1\n");
    sh(dir, "add", "-A");
    f2.repo.status = "indexing";
    f2.repo.getDelayMs = 1500;
    const t = Date.now();
    const r = await run(["index"], { PIPESHUB_INDEX_WAIT_SECONDS: "4" });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("still indexing");
    expect(Date.now() - t).toBeLessThan(9000);
  }, 30_000);

  test("a long wait for indexing renews the sign-in when the access token runs out in the middle (an hour-long index ended \"not signed in\")", async () => {
    await writeFile(join(dir, "a.py"), "x = 1\n");
    sh(dir, "add", "-A");
    const file = join(h2, ".config", "pipeshub", "credentials.json");
    await mkdir(join(h2, ".config", "pipeshub"), { recursive: true });
    await writeFile(file, JSON.stringify({
      origin: f2.origin, clientId: "c", tokenEndpoint: `${f2.origin}/api/v1/oauth2/token`,
      accessToken: f2.issuedToken, refreshToken: "refresh-0", expiresAt: Date.now() + 3_600_000,
    }), { mode: 0o600 });
    f2.repo.status = "indexing";
    const proc = Bun.spawn(["node", join(import.meta.dir, "..", "standalone", "bin", "pipeshub.js"), "index"], {
      cwd: dir, env: { PATH: "/usr/bin:/bin", HOME: h2, PIPESHUB_BASE_URL: f2.origin, GIT_CEILING_DIRECTORIES: root, PIPESHUB_INDEX_WAIT_SECONDS: "60" }, stdout: "pipe", stderr: "pipe",
    });
    try {
      await new Promise((r) => setTimeout(r, 2500)); // pushed, now polling
      await writeFile(file, JSON.stringify({ ...JSON.parse(await readFile(file, "utf8")), expiresAt: Date.now() - 1000 })); // the hour is up
      f2.issuedToken = "the-server-moved-on";                                                                                // and the old token no longer works
      await new Promise((r) => setTimeout(r, 2500));
      f2.repo.status = "ready";
      const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      expect(code, err).toBe(0);
      expect(JSON.parse(out).state).toBe("ready");
    } finally {
      proc.kill();
    }
  }, 60_000);

  test("--watch signs in again when the access token has expired, instead of failing every later edit", async () => {
    await writeFile(join(dir, "a.py"), "x = 1\n");
    sh(dir, "add", "-A");
    const creds = {
      origin: f2.origin, clientId: "c", tokenEndpoint: `${f2.origin}/api/v1/oauth2/token`,
      accessToken: f2.issuedToken, refreshToken: "refresh-0", expiresAt: Date.now() + 3_600_000,
    };
    await mkdir(join(h2, ".config", "pipeshub"), { recursive: true });
    await writeFile(join(h2, ".config", "pipeshub", "credentials.json"), JSON.stringify(creds), { mode: 0o600 });
    // Node, on the built file: recursive fs.watch is what the installed command uses, and Bun's differs.
    const proc = Bun.spawn(["node", join(import.meta.dir, "..", "standalone", "bin", "pipeshub.js"), "index", "--watch"], {
      cwd: dir, env: { PATH: "/usr/bin:/bin", HOME: h2, PIPESHUB_BASE_URL: f2.origin, GIT_CEILING_DIRECTORIES: root }, stdout: "pipe", stderr: "pipe",
    });
    try {
      for (let i = 0; i < 40 && f2.repo.commits < 1; i++) await new Promise((r) => setTimeout(r, 250));
      expect(f2.repo.commits).toBeGreaterThanOrEqual(1);
      // an hour passes: the stored access token is past its expiry and the server no longer accepts it
      const file = join(h2, ".config", "pipeshub", "credentials.json");
      await writeFile(file, JSON.stringify({ ...JSON.parse(await readFile(file, "utf8")), expiresAt: Date.now() - 1000 }), { mode: 0o600 });
      f2.issuedToken = "rotated-by-the-server";
      await writeFile(join(dir, "b.py"), "z = 3\n");
      sh(dir, "add", "-A");
      for (let i = 0; i < 80 && !f2.repo.files.has("b.py"); i++) await new Promise((r) => setTimeout(r, 250));
      proc.kill();
      expect(f2.repo.files.has("b.py"), await new Response(proc.stderr).text()).toBe(true);
    } finally {
      proc.kill();
    }
  }, 60_000);
});

test("watch mode ignores .git, node_modules and dist at any depth, and nothing else", () => {
  for (const f of [".git/HEAD", "node_modules/x/y.js", "pkg/node_modules/x.js", "dist/a.js", "web/dist/b.js"]) expect(unwatched(f)).toBe(true);
  for (const f of ["src/a.py", "distance.py", "gitignore.txt", "src/.github/ci.yml"]) expect(unwatched(f)).toBe(false);
});
