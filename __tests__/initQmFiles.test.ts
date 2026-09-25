import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initQm,
  readDeploymentShape,
  renderInitReport,
  type InitResult,
} from "../src/cli/init-qm.js";

// `pipeshub init-qm <dir>` is run by an operator against their own deployment
// directory. It writes files they will commit and deploy, and it must never
// clobber a file of theirs without --force. Every case here runs against a
// fresh temporary directory; the bundle it copies is the one in this checkout.

const PKG = JSON.parse(
  await readFile(join(import.meta.dir, "..", "package.json"), "utf8"),
) as { version: string };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mcpcov-init-qm-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const tool = () => join(dir, "sandbox", "tools", "pipeshub", "tool.json");
const skill = () => join(dir, "sandbox", "skills", "pipeshub", "SKILL.md");
const dockerfile = () => join(dir, "sandbox", "Dockerfile");

async function writeConfig(body: string): Promise<void> {
  await writeFile(join(dir, "qm.config.jsonc"), body, "utf8");
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(() => true, () => false);
}

describe("initQm into an empty directory", () => {
  test("copies the tool and skill and creates a Dockerfile pinned to this version", async () => {
    const r = await initQm(dir, false);

    expect(r.written.sort()).toEqual([dockerfile(), skill(), tool()].sort());
    expect(r.skipped).toEqual([]);
    expect(r.dockerfileAction).toBe("created");
    expect(r.version).toBe(PKG.version);
    expect(r.shape).toBeNull();
    expect(r.skipReason).toBeNull();
    expect(r.staleDockerfile).toBe(false);

    // The copies are byte-for-byte the bundle, so an operator never deploys a
    // tool.json that differs from the one this CLI version was written against.
    const bundle = join(import.meta.dir, "..", "qm", "sandbox");
    expect(await readFile(tool(), "utf8"))
      .toBe(await readFile(join(bundle, "tools", "pipeshub", "tool.json"), "utf8"));
    expect(await readFile(skill(), "utf8"))
      .toBe(await readFile(join(bundle, "skills", "pipeshub", "SKILL.md"), "utf8"));

    const df = await readFile(dockerfile(), "utf8");
    expect(df).toContain(`ARG PIPESHUB_CLI_VERSION=${PKG.version}\n`);
    expect(df.match(/ARG PIPESHUB_CLI_VERSION=/g)).toHaveLength(1);
  });

  test("returns the config fragment the operator has to merge by hand", async () => {
    const r = await initQm(dir, false);
    expect(r.configFragment).toBe(
      await readFile(join(import.meta.dir, "..", "qm", "qm.config.fragment.jsonc"), "utf8"),
    );
  });

  test("creates a target directory that does not exist yet", async () => {
    const nested = join(dir, "not", "there", "yet");
    const r = await initQm(nested, false);
    expect(r.written).toContain(join(nested, "sandbox", "tools", "pipeshub", "tool.json"));
    expect(await exists(join(nested, "sandbox", "Dockerfile"))).toBe(true);
  });
});

describe("initQm over an existing deployment", () => {
  test("a second run keeps every file and reports it as kept", async () => {
    await initQm(dir, false);
    await writeFile(tool(), '{"edited":"by the operator"}', "utf8");

    const r = await initQm(dir, false);

    expect(r.written).toEqual([]);
    expect(r.skipped.sort()).toEqual([skill(), tool()].sort());
    // Our block is already in the Dockerfile, so it is left alone, not re-appended.
    expect(r.dockerfileAction).toBe("manual");
    expect(await readFile(tool(), "utf8")).toBe('{"edited":"by the operator"}');
  });

  test("--force replaces the tool and skill but still never rewrites the Dockerfile", async () => {
    await initQm(dir, false);
    await writeFile(tool(), "stale", "utf8");
    const edited = (await readFile(dockerfile(), "utf8")) + "\nRUN echo operator-step\n";
    await writeFile(dockerfile(), edited, "utf8");

    const r = await initQm(dir, true);

    expect(r.written.sort()).toEqual([skill(), tool()].sort());
    expect(r.skipped).toEqual([]);
    expect(await readFile(tool(), "utf8")).not.toBe("stale");
    // The Dockerfile is shared with whatever else the operator installs.
    expect(await readFile(dockerfile(), "utf8")).toBe(edited);
    expect(r.dockerfileAction).toBe("manual");
  });

  test("an operator's own Dockerfile gets our install block appended once", async () => {
    await mkdir(join(dir, "sandbox"), { recursive: true });
    const theirs = "FROM ghcr.io/yc-software/qm/sandbox-base\nRUN apt-get install -y jq\n\n\n";
    await writeFile(dockerfile(), theirs, "utf8");

    const first = await initQm(dir, false);
    const afterFirst = await readFile(dockerfile(), "utf8");

    expect(first.dockerfileAction).toBe("appended");
    // Appended, and nothing of theirs rewritten.
    expect(afterFirst.startsWith("FROM ghcr.io/yc-software/qm/sandbox-base\nRUN apt-get install -y jq\n"))
      .toBe(true);
    expect(afterFirst).toContain(`RUN npm install -g "@pipeshub-ai/mcp@${PKG.version}"`);
    // Trailing blank lines collapse to one newline before the block.
    expect(afterFirst).toContain("install -y jq\n\n# --- PipesHub");
    // Appending is not listed as "wrote": the file is theirs.
    expect(first.written).not.toContain(dockerfile());

    const second = await initQm(dir, false);
    expect(second.dockerfileAction).toBe("manual");
    expect(await readFile(dockerfile(), "utf8")).toBe(afterFirst);
  });
});

describe("initQm reads the deployment shape from qm.config.jsonc", () => {
  test("the documented Sprites deploy gets no Dockerfile", async () => {
    await writeConfig(`{
      // written by qm init
      "target": "docker",
      "sandbox": { "backend": "sprites", },
    }`);

    const r = await initQm(dir, false);

    expect(r.shape).toEqual({ target: "docker", backend: "sprites" });
    expect(r.skipReason).toBe("sprites-ignores-image");
    expect(r.dockerfileAction).toBe("skipped-unusable");
    expect(r.staleDockerfile).toBe(false);
    expect(await exists(dockerfile())).toBe(false);
    // The tool and skill still arrive; only the image is pointless.
    expect(r.written.sort()).toEqual([skill(), tool()].sort());
  });

  test("a Dockerfile left by an earlier version is flagged, and not deleted", async () => {
    await writeConfig('{ "sandbox": { "backend": "sprites" } }');
    await mkdir(join(dir, "sandbox"), { recursive: true });
    await writeFile(dockerfile(), "FROM x\n", "utf8");

    const r = await initQm(dir, false);

    expect(r.staleDockerfile).toBe(true);
    expect(await readFile(dockerfile(), "utf8")).toBe("FROM x\n");
  });

  test("AWS MicroVM is reported as such", async () => {
    await writeConfig('{ "target": "aws", "sandbox": { "backend": "aws" } }');
    const r = await initQm(dir, false);
    expect(r.skipReason).toBe("aws-microvm");
    expect(await exists(dockerfile())).toBe(false);
  });

  test("an unparseable config scaffolds as if there were none", async () => {
    await writeConfig("{ this is not json");
    const r = await initQm(dir, false);
    expect(r.shape).toBeNull();
    expect(r.dockerfileAction).toBe("created");
  });
});

describe("readDeploymentShape", () => {
  test("no config file is null", async () => {
    expect(await readDeploymentShape(dir)).toBeNull();
  });

  test("a config that names neither target nor backend is null", async () => {
    await writeConfig('{ "sandbox": { "baseImage": "x" } }');
    expect(await readDeploymentShape(dir)).toBeNull();
  });

  test("non-string values are ignored rather than trusted", async () => {
    await writeConfig('{ "target": 7, "sandbox": { "backend": "sprites" } }');
    expect(await readDeploymentShape(dir)).toEqual({ target: undefined, backend: "sprites" });
  });

  test("a config whose top level is null does not throw", async () => {
    await writeConfig("null");
    expect(await readDeploymentShape(dir)).toBeNull();
  });
});

describe("renderInitReport", () => {
  const base = (over: Partial<InitResult> = {}): InitResult => ({
    written: ["/d/sandbox/tools/pipeshub/tool.json"],
    skipped: ["/d/sandbox/skills/pipeshub/SKILL.md"],
    dockerfileAction: "created",
    shape: null,
    skipReason: null,
    staleDockerfile: false,
    version: "9.9.9",
    configFragment: "{}",
    ...over,
  });

  test("lists what was written and kept, and the two manual steps", () => {
    const out = renderInitReport("/d", base());
    expect(out).toContain("Scaffolded the PipesHub bundle into /d");
    expect(out).toContain("CLI version pinned: 9.9.9");
    expect(out).toContain("  wrote   /d/sandbox/tools/pipeshub/tool.json");
    expect(out).toContain("  kept    /d/sandbox/skills/pipeshub/SKILL.md  (already existed — use --force to replace)");
    expect(out).toContain("1. Set `egress` in sandbox/tools/pipeshub/tool.json");
    expect(out).toContain("2. Each person adds two personal keychain entries");
    expect(out).toContain("Then:  qm check && qm up");
    // The report must steer people away from the org-wide secret, every time.
    expect(out).toContain("Do NOT put a token in sandbox.secretEnv");
  });

  test("a skipped Dockerfile says why, for each reason", () => {
    const sprites = renderInitReport("/d", base({
      dockerfileAction: "skipped-unusable",
      skipReason: "sprites-ignores-image",
    }));
    expect(sprites).toContain("Fly Sprites boot the stock");
    expect(sprites).not.toContain("Lambda MicroVM");
    expect(sprites).not.toContain("qm sandbox publish");

    const aws = renderInitReport("/d", base({
      dockerfileAction: "skipped-unusable",
      skipReason: "aws-microvm",
    }));
    expect(aws).toContain("AWS Lambda MicroVM sandboxes");
    expect(aws).toContain("Heads up on AWS");
  });

  test("a stale Dockerfile is an action item", () => {
    const out = renderInitReport("/d", base({
      dockerfileAction: "skipped-unusable",
      skipReason: "sprites-ignores-image",
      staleDockerfile: true,
    }));
    expect(out).toContain("ACTION NEEDED: sandbox/Dockerfile already exists here");
  });

  test("appended and manual Dockerfiles each say what happened", () => {
    expect(renderInitReport("/d", base({ dockerfileAction: "appended" })))
      .toContain("Appended the install block to your existing sandbox/Dockerfile.");
    expect(renderInitReport("/d", base({ dockerfileAction: "manual" })))
      .toContain("already mentions @pipeshub-ai/mcp, so it was left untouched. Check the pinned version matches 9.9.9.");
  });
});
