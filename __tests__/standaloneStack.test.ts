import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devUp, findLocal } from "../src/cli/standalone/stack.js";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// Which listener on this computer `init` may treat as PipesHub without being told.

let fake: FakeLocal | null = null;
afterEach(() => { fake?.stop(); fake = null; });

async function home(): Promise<NodeJS.ProcessEnv> {
  return { HOME: await mkdtemp(join(tmpdir(), "l9i-stack-")) };
}

describe("findLocal", () => {
  test("a listener on the default port that cannot show it is PipesHub (no org, so no sign-in app) is not adopted", async () => {
    // Anything on 127.0.0.1 can answer /api/v1/health and say {"exists": false}; init would then send it a new admin password.
    fake = startFakeLocal();
    const env = await home();
    expect(await findLocal(env, Number(new URL(fake.origin).port))).toBeNull();
    await rm(env["HOME"]!, { recursive: true, force: true });
  });

  test("a stale state.json pointing at a listener that is not the stack's container is not adopted", async () => {
    fake = startFakeLocal({ orgExists: true });
    const env = await home();
    const dir = await mkdtemp(join(tmpdir(), "l9i-nodocker-"));
    await writeFile(join(dir, "docker"), "#!/bin/sh\nexit 1\n", { mode: 0o755 }); // compose knows no such project
    const port = Number(new URL(fake.origin).port);
    await mkdir(join(env["HOME"]!, ".pipeshub", "standalone"), { recursive: true });
    await writeFile(join(env["HOME"]!, ".pipeshub", "standalone", "state.json"), JSON.stringify({ project: "gone", port, origin: fake.origin }));
    expect(await findLocal({ ...env, PIPESHUB_DOCKER: join(dir, "docker") }, 1)).toBeNull();
    await writeFile(join(dir, "docker"), `#!/bin/sh\ncase "$*" in *" port "*) echo "127.0.0.1:${port}" ;; esac\n`, { mode: 0o755 });
    expect(await findLocal({ ...env, PIPESHUB_DOCKER: join(dir, "docker") }, 1)).toBe(fake.origin);
    await rm(dir, { recursive: true, force: true });
  });

  test("one that has an organisation and offers the CLI sign-in is", async () => {
    fake = startFakeLocal({ orgExists: true });
    const env = await home();
    expect(await findLocal(env, Number(new URL(fake.origin).port))).toBe(fake.origin);
    await rm(env["HOME"]!, { recursive: true, force: true });
  });
});

describe("devUp when compose cannot start the stack", () => {
  test("what the failed attempt created is taken down again, with its volumes on a first start", async () => {
    const dir = await mkdtemp(join(tmpdir(), "l9i-dock-"));
    const log = join(dir, "docker.log");
    await writeFile(join(dir, "docker"), `#!/bin/sh\necho "$@" >> ${log}\ncase "$*" in *" up "*) exit 1 ;; esac\nexit 0\n`);
    await chmod(join(dir, "docker"), 0o755);
    const env = { HOME: join(dir, "home"), PATH: `${dir}:/usr/bin:/bin` };
    await expect(devUp({ port: 65111, project: "l9i-fail", waitSeconds: 1 }, env)).rejects.toThrow(/docker compose up/);
    const calls = (await readFile(log, "utf8")).split("\n").filter((l) => l.includes("compose -p l9i-fail"));
    expect(calls.some((l) => / up -d$/.test(l))).toBe(true);
    expect(calls.at(-1)).toMatch(/ down --volumes$/);
    await rm(dir, { recursive: true, force: true });
  });
});
