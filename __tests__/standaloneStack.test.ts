import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PROJECT, devStatus, devUp, findLocal, parseEnvFile } from "../src/cli/standalone/stack.js";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// Which listener on this computer `init` may treat as PipesHub without being told.

let fake: FakeLocal | null = null;
afterEach(() => { fake?.stop(); fake = null; });

async function home(): Promise<NodeJS.ProcessEnv> {
  return { HOME: await mkdtemp(join(tmpdir(), "standalone-stack-")) };
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
    const dir = await mkdtemp(join(tmpdir(), "standalone-nodocker-"));
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

describe("devUp when the stack's own images are not published", () => {
  // A docker that resolves the two images, has none locally, and (when `pull` fails) cannot pull them.
  async function shim(pullOk: boolean) {
    const dir = await mkdtemp(join(tmpdir(), "standalone-img-"));
    const log = join(dir, "docker.log");
    const cfg = JSON.stringify({ services: { postgres: { image: "pipeshubai/postgres:18-1" }, "pipeshub-migrate": { image: "pipeshubai/pipeshub-migrate:latest" } } });
    await writeFile(join(dir, "docker"), `#!/bin/sh\necho "$@" >> ${log}\ncase "$*" in\n *" config "*) echo '${cfg}' ;;\n "image inspect"*) exit 1 ;;\n "pull"*) exit ${pullOk ? 0 : 1} ;;\n *" up "*) exit 1 ;;\nesac\nexit 0\n`, { mode: 0o755 });
    return { dir, log, env: { HOME: join(dir, "home"), PATH: `${dir}:/usr/bin:/bin` } };
  }

  test("fails before `up`, naming the image and the variables that point at a local one", async () => {
    const t = await shim(false);
    const err = await devUp({ port: 65112, project: "standalone-img", waitSeconds: 1 }, t.env).catch((e: Error) => e);
    expect((err as Error).message).toContain("pipeshubai/postgres:18-1");
    expect((err as Error).message).toMatch(/PG_IMAGE.*PIPESHUB_MIGRATE_IMAGE/);
    expect(await readFile(t.log, "utf8")).not.toMatch(/ up /);
    await rm(t.dir, { recursive: true, force: true });
  });

  test("an image that pulls is fine: `up` runs", async () => {
    const t = await shim(true);
    await expect(devUp({ port: 65113, project: "standalone-img", waitSeconds: 1 }, t.env)).rejects.toThrow(/docker compose up/);
    expect(await readFile(t.log, "utf8")).toMatch(/ up /);
    await rm(t.dir, { recursive: true, force: true });
  });
});

describe("devUp when compose cannot start the stack", () => {
  test("what the failed attempt created is taken down again, but never its volumes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "standalone-dock-"));
    const log = join(dir, "docker.log");
    await writeFile(join(dir, "docker"), `#!/bin/sh\necho "$@" >> ${log}\ncase "$*" in *" up "*) exit 1 ;; esac\nexit 0\n`);
    await chmod(join(dir, "docker"), 0o755);
    const env = { HOME: join(dir, "home"), PATH: `${dir}:/usr/bin:/bin` };
    await expect(devUp({ port: 65111, project: "standalone-fail", waitSeconds: 1 }, env)).rejects.toThrow(/docker compose up/);
    const calls = (await readFile(log, "utf8")).split("\n").filter((l) => l.includes("compose -p standalone-fail"));
    expect(calls.some((l) => / up -d$/.test(l))).toBe(true);
    expect(calls.at(-1)).toMatch(/ down$/);
    await rm(dir, { recursive: true, force: true });
  });
});

describe("the web browser pack on a stack started by `pipeshub dev up`", () => {
  test("the compose file applies the seccomp profile and `dev up` writes it next to the compose file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "standalone-sec-"));
    await writeFile(join(dir, "docker"), `#!/bin/sh\ncase "$*" in *" up "*) exit 1 ;; esac\nexit 0\n`);
    await chmod(join(dir, "docker"), 0o755);
    const env = { HOME: join(dir, "home"), PATH: `${dir}:/usr/bin:/bin` };
    await devUp({ port: 65112, project: "standalone-sec", waitSeconds: 1 }, env).catch(() => undefined);
    const compose = await readFile(join(dir, "home", ".pipeshub", "standalone", "docker-compose.yml"), "utf8");
    expect(compose).toContain("security_opt:\n      - seccomp=./seccomp-browser.json");
    const profile = JSON.parse(await readFile(join(dir, "home", ".pipeshub", "standalone", "seccomp-browser.json"), "utf8"));
    const allowed = (name: string) => profile.syscalls.filter((r: any) => r.names.includes(name) && r.action === "SCMP_ACT_ALLOW" && !r.includes?.caps);
    expect(allowed("setns")).toEqual([]);
    for (const name of ["clone", "unshare"]) {
      expect(allowed(name).some((r: any) => r.args?.[0]?.value === 0x0e020000 && r.args[0].op === "SCMP_CMP_MASKED_EQ")).toBe(true);
    }
    await rm(dir, { recursive: true, force: true });
  });
});

test("the default project does not clash with the repository's own slim compose", () => {
  expect(DEFAULT_PROJECT).toBe("pipeshub-standalone");
});

test("an .env line is read whatever case or digits its name has", () => {
  expect(parseEnvFile("SECRET_KEY=a\nPg2_x=b\n_lead=c\n9bad=d\n# note\n")).toEqual({ SECRET_KEY: "a", Pg2_x: "b", _lead: "c" });
});

test("dev status reports the graph database's health", async () => {
  const dir = await mkdtemp(join(tmpdir(), "standalone-status-"));
  await writeFile(join(dir, "docker"), `#!/bin/sh\ncase "$*" in *" ps "*) echo healthy ;; esac\nexit 0\n`);
  await chmod(join(dir, "docker"), 0o755);
  const home = join(dir, "home");
  await mkdir(join(home, ".pipeshub", "standalone"), { recursive: true });
  await writeFile(join(home, ".pipeshub", "standalone", "state.json"), JSON.stringify({ project: "p", port: 65199, origin: "http://127.0.0.1:65199" }));
  const status = await devStatus({ HOME: home, PATH: `${dir}:/usr/bin:/bin` });
  expect(status).toMatchObject({ configured: true, neo4j: "healthy" });
  await rm(dir, { recursive: true, force: true });
});
