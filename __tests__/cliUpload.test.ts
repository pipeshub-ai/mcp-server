import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { upload } from "../src/cli/write-commands.js";
import { EXIT } from "../src/cli/config.js";

// `pipeshub upload` reads the user's disk, so the ways it goes wrong are local:
// a folder not walked, a file of a type the server refuses sent anyway, a
// per-file failure that still exits 0.

const KB = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
let dir = "";
let server: ReturnType<typeof Bun.serve>;
let fail = new Set<string>();
const received: string[][] = [];

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "pipeshub-upload-"));
  await writeFile(join(dir, "a.md"), "# A");
  await writeFile(join(dir, "run.exe"), "MZ");
  await writeFile(join(dir, ".hidden.md"), "secret");
  await mkdir(join(dir, "sub"));
  await writeFile(join(dir, "sub", "c.txt"), "C");
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const form = await req.formData();
      const names = (form.getAll("files") as File[]).map((f) => f.name);
      received.push(names);
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
      skipped: [{ path: join(dir, "run.exe"), reason: "unsupported extension" }],
    });
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
