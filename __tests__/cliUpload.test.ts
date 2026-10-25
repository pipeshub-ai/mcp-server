import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { upload } from "../src/cli/write-commands.js";
import { EXIT } from "../src/cli/config.js";

// `pipeshub upload` reads the user's disk, so the ways it goes wrong are local:
// a folder not walked, a file of a type the server refuses sent anyway, a
// per-file failure that still exits 0.

const KB = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
let dir = "";
let outside = "";
let server: ReturnType<typeof Bun.serve>;
let fail = new Set<string>();
const received: string[][] = [];
const stored: string[][] = [];

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "pipeshub-upload-"));
  await writeFile(join(dir, "a.md"), "# A");
  await writeFile(join(dir, "run.exe"), "MZ");
  await writeFile(join(dir, ".hidden.md"), "secret");
  await mkdir(join(dir, "sub"));
  await writeFile(join(dir, "sub", "c.txt"), "C");
  // Links inside the folder must not be followed: out of the tree, dangling, or back to a parent.
  outside = await mkdtemp(join(tmpdir(), "pipeshub-outside-"));
  await writeFile(join(outside, "secret.txt"), "private");
  await symlink(join(outside, "secret.txt"), join(dir, "notes.txt"));
  await symlink(join(dir, "gone.md"), join(dir, "dangling.md"));
  await symlink(dir, join(dir, "sub", "loop"));
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const form = await req.formData();
      const names = (form.getAll("files") as File[]).map((f) => f.name);
      received.push(names);
      stored.push(JSON.parse(form.get("files_metadata") as string).map((m: { file_path: string }) => m.file_path));
      const frames = names.map((n) =>
        fail.has(n)
          ? `event: file:failed\ndata: ${JSON.stringify({ fileName: n, errors: ["bad"] })}\n\n`
          : `event: file:succeeded\ndata: ${JSON.stringify({ recordId: `r-${n}`, fileName: n })}\n\n`
      ).join("");
      return new Response(`${frames}event: done\ndata: {"summary":{}}\n\n`, {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
});

afterAll(async () => {
  server.stop(true);
  await rm(dir, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

const ctx = () => ({
  origin: `http://127.0.0.1:${server.port}`,
  token: "test",
  insecureHttp: false,
  requestId: "req-1",
  json: true,
  maxChars: 2000,
});

describe("pipeshub upload", () => {
  test("walks folders, skips dot-files and unsupported types, and reports what it skipped", async () => {
    fail = new Set();
    received.length = 0;
    const out = await upload(ctx(), KB, [dir]);
    expect(received.flat().sort()).toEqual(["a.md", "c.txt"]);
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload).toMatchObject({
      collectionId: KB,
      uploaded: [{ recordId: "r-a.md", name: "a.md" }, { recordId: "r-c.txt", name: "c.txt" }],
      failed: [],
    });
    expect((out.payload["skipped"] as Array<{ path: string }>).map((s) => s.path).sort()).toEqual(
      [join(dir, "dangling.md"), join(dir, "notes.txt"), join(dir, "run.exe"), join(dir, "sub", "loop")].sort(),
    );
  });

  test("files keep their path under the named folder, so same-named files in different folders do not collide", async () => {
    const root = await mkdtemp(join(tmpdir(), "pipeshub-docs-"));
    await mkdir(join(root, "sub"));
    await mkdir(join(root, "other"));
    await writeFile(join(root, "sub", "a.md"), "1");
    await writeFile(join(root, "other", "a.md"), "2");
    fail = new Set();
    stored.length = 0;
    try {
      await upload(ctx(), KB, [root, join(dir, "a.md")]);
      const top = root.slice(root.lastIndexOf("/") + 1);
      expect(stored.flat().sort()).toEqual([`${top}/other/a.md`, `${top}/sub/a.md`, "a.md"].sort());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("a symlink named on the command line is followed, since the user chose it", async () => {
    fail = new Set();
    received.length = 0;
    await upload(ctx(), KB, [join(dir, "notes.txt")]);
    expect(received.flat()).toEqual(["notes.txt"]);
  });

  test("a public cleartext origin is refused before any file is read or sent", async () => {
    received.length = 0;
    await expect(upload({ ...ctx(), origin: "http://pipeshub.example.com" }, KB, [dir])).rejects.toThrow();
    expect(received).toHaveLength(0);
  });

  test("a file the server rejects makes the command exit non-zero", async () => {
    fail = new Set(["c.txt"]);
    const out = await upload(ctx(), KB, [dir]);
    expect(out.exit).toBe(EXIT.ERROR);
    expect(out.payload).toMatchObject({ failed: [{ name: "c.txt", errors: ["bad"] }] });
  });

  test("a path with nothing to upload is a usage error, not an empty success", async () => {
    await expect(upload(ctx(), KB, [join(dir, "run.exe")])).rejects.toMatchObject({ code: EXIT.USAGE });
    await expect(upload(ctx(), KB, [join(dir, "missing")])).rejects.toMatchObject({ code: EXIT.USAGE });
  });
});
