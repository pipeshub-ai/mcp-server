// `pipeshub init-qm <dir>` — scaffold the QM deployment-layer bundle into an
// operator's deployment directory.
//
// Why this exists rather than "copy the folder from the repo": the bundle and
// the CLI it describes are one contract. Copying by hand lets an operator end
// up with a tool.json written for a different version of the binary that is
// actually installed, and that mismatch is silent — an approval rule naming a
// subcommand that no longer exists compiles to a pattern matching nothing.
// Scaffolding from the installed package makes the two versions the same by
// construction, and stamps the version into the Dockerfile's pin.

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError, EXIT } from "./config.js";

/**
 * Walk up from this module to the package root. The CLI runs from two possible
 * layouts — `bin/pipeshub.js` (bundled) and `esm/cli/pipeshub.js` (tsc) — so a
 * fixed number of `..` would be wrong for one of them.
 */
async function packageRoot(): Promise<string> {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      const raw = await readFile(join(dir, "package.json"), "utf8");
      const pkg = JSON.parse(raw) as { name?: string; version?: string };
      if (pkg.name === "@pipeshub-ai/mcp") return dir;
    } catch {
      // keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new CliError(
    "could not locate the installed package root — reinstall @pipeshub-ai/mcp",
  );
}

async function packageVersion(root: string): Promise<string> {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    version?: string;
  };
  return pkg.version ?? "latest";
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Copy a directory tree, reporting what was written and what was left alone. */
async function copyTree(
  from: string,
  to: string,
  force: boolean,
  written: string[],
  skipped: string[],
): Promise<void> {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) {
      await copyTree(src, dst, force, written, skipped);
      continue;
    }
    if (!force && await exists(dst)) {
      skipped.push(dst);
      continue;
    }
    await copyFile(src, dst);
    written.push(dst);
  }
}

const DOCKERFILE_NOTE = (version: string) => `
# --- PipesHub ---------------------------------------------------------------
# Installs the \`pipeshub\` binary. Pin the version: the sandbox image and the
# PipesHub instance's MCP tool surface need to stay compatible, and an unpinned
# install turns a remote release into a silent change in agent behaviour.
RUN npm install -g "@pipeshub-ai/mcp@${version}" \\
 && pipeshub --help >/dev/null
# ----------------------------------------------------------------------------
`;

/**
 * Strip JSONC comments without mangling `//` inside string values.
 *
 * The naive version eats the second slash of `"https://example.com"` and turns
 * a valid config into a parse error, which is a maddening failure to debug in
 * a file the operator did not know we read.
 */
export function stripJsonComments(src: string): string {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (inLine) {
      if (c === "\n") { inLine = false; out += c; }
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") { inBlock = false; i++; }
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\") { out += next ?? ""; i++; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === "/" && next === "/") { inLine = true; i++; continue; }
    if (c === "/" && next === "*") { inBlock = true; i++; continue; }
    out += c;
  }
  return out;
}

export interface DeploymentShape {
  target?: string | undefined;
  backend?: string | undefined;
}

/**
 * Read `target` and `sandbox.backend` from the operator's existing
 * qm.config.jsonc. Returns null when there is no readable config — a fresh
 * directory, or a file we cannot parse. Never throws: this only decides how
 * much to scaffold, and a config we cannot read must not stop the scaffold.
 */
export async function readDeploymentShape(
  dest: string,
): Promise<DeploymentShape | null> {
  try {
    const raw = await readFile(join(dest, "qm.config.jsonc"), "utf8");
    const cfg = JSON.parse(stripJsonComments(raw)) as {
      target?: unknown;
      sandbox?: { backend?: unknown };
    };
    const target = typeof cfg.target === "string" ? cfg.target : undefined;
    const backend = typeof cfg.sandbox?.backend === "string"
      ? cfg.sandbox.backend
      : undefined;
    if (!target && !backend) return null;
    return { target, backend };
  } catch {
    return null;
  }
}

/**
 * Whether a custom sandbox image can actually boot for this deployment.
 *
 * Writing a Dockerfile that cannot run is not harmless. It reads as the
 * supported install path, so when the binary is missing the operator debugs
 * the Dockerfile rather than learning the image was never used
 * (yc-software/qm#272 on Sprites, #350 on AWS MicroVM).
 *
 * Unknown shapes scaffold as before: guessing wrong in the other direction
 * would remove a file someone needs.
 */
export function customImageBoots(shape: DeploymentShape | null): boolean {
  if (!shape) return true;
  if (shape.backend === "sprites" || shape.backend === "aws") return false;
  if (shape.target === "fly" || shape.target === "aws") return false;
  return true;
}

export interface InitResult {
  written: string[];
  skipped: string[];
  dockerfileAction: "created" | "appended" | "manual" | "skipped-unusable";
  shape: DeploymentShape | null;
  version: string;
  configFragment: string;
}

export async function initQm(
  targetDir: string,
  force: boolean,
): Promise<InitResult> {
  const root = await packageRoot();
  const bundle = join(root, "qm");
  if (!await exists(join(bundle, "sandbox"))) {
    throw new CliError(
      `the QM bundle is missing from the installed package (looked in ${bundle}). `
        + "This build was packaged without it.",
    );
  }

  const version = await packageVersion(root);
  const dest = resolve(targetDir);
  const shape = await readDeploymentShape(dest);
  const written: string[] = [];
  const skipped: string[] = [];

  // Tools and skills copy cleanly — they are ours and live in their own
  // subdirectories, so merging with an existing sandbox/ cannot collide with
  // anything the operator wrote.
  for (const sub of ["tools/pipeshub", "skills/pipeshub"]) {
    await copyTree(
      join(bundle, "sandbox", sub),
      join(dest, "sandbox", sub),
      force,
      written,
      skipped,
    );
  }

  // The Dockerfile is shared with whatever else the operator installs, so it is
  // never overwritten. Create it if absent, append our block if it exists and
  // has no PipesHub block yet, and otherwise leave it entirely alone.
  const dockerfile = join(dest, "sandbox", "Dockerfile");
  let dockerfileAction: InitResult["dockerfileAction"];
  if (!customImageBoots(shape)) {
    // Deliberately not written. The skill installs the CLI on first use, which
    // is the path that actually runs on these deployments.
    dockerfileAction = "skipped-unusable";
  } else if (!await exists(dockerfile)) {
    await copyFile(join(bundle, "sandbox", "Dockerfile"), dockerfile);
    // Restamp the pin so it matches the version actually installed.
    const body = await readFile(dockerfile, "utf8");
    await writeFile(
      dockerfile,
      body.replace(
        /ARG PIPESHUB_CLI_VERSION=.*/,
        `ARG PIPESHUB_CLI_VERSION=${version}`,
      ),
      "utf8",
    );
    written.push(dockerfile);
    dockerfileAction = "created";
  } else {
    const body = await readFile(dockerfile, "utf8");
    if (body.includes("@pipeshub-ai/mcp")) {
      dockerfileAction = "manual";
    } else {
      await writeFile(dockerfile, body.replace(/\n*$/, "\n") + DOCKERFILE_NOTE(version), "utf8");
      dockerfileAction = "appended";
    }
  }

  // Do not swallow this. The fragment is part of the bundle contract; a
  // successful init that cannot read it means the package was assembled wrong.
  const fragmentPath = join(bundle, "qm.config.fragment.jsonc");
  let configFragment: string;
  try {
    configFragment = await readFile(fragmentPath, "utf8");
  } catch (e: unknown) {
    throw new CliError(
      `the QM bundle is incomplete — could not read ${fragmentPath} `
        + `(${(e as Error).message}). Reinstall @pipeshub-ai/mcp.`,
    );
  }

  return { written, skipped, dockerfileAction, version, configFragment, shape };
}

export function renderInitReport(dest: string, r: InitResult): string {
  const lines: string[] = [];
  lines.push(`Scaffolded the PipesHub bundle into ${dest}`);
  lines.push(`CLI version pinned: ${r.version}`);
  lines.push("");
  for (const f of r.written) lines.push(`  wrote   ${f}`);
  for (const f of r.skipped) lines.push(`  kept    ${f}  (already existed — use --force to replace)`);
  lines.push("");

  if (r.dockerfileAction === "skipped-unusable") {
    const where = r.shape?.backend === "aws" || r.shape?.target === "aws"
      ? "AWS MicroVM sandboxes"
      : "Fly Sprites";
    lines.push(`No sandbox/Dockerfile was written: ${where} cannot boot a custom`);
    lines.push("image, so one would look like the install path while never running.");
    lines.push("The skill installs the CLI on first use instead — that is the line");
    lines.push("that actually executes, and it needs nothing from you.");
    lines.push("");
  }

  if (r.shape?.backend === "aws" || r.shape?.target === "aws") {
    lines.push("Heads up on AWS: the CLI cannot be installed into a MicroVM sandbox");
    lines.push("at all (yc-software/qm#350). The tool's guidance, network allowlist,");
    lines.push("and approval rules still apply, but the binary will be missing. The");
    lines.push("sprites backend is the one this bundle is tested against.");
  }

  if (r.dockerfileAction === "appended") {
    lines.push("Appended the install block to your existing sandbox/Dockerfile.");
  } else if (r.dockerfileAction === "manual") {
    lines.push(
      "Your sandbox/Dockerfile already mentions @pipeshub-ai/mcp, so it was left"
        + " untouched. Check the pinned version matches " + r.version + ".",
    );
  }

  lines.push("");
  lines.push("Two things left to do:");
  lines.push("");
  lines.push("1. Set `egress` in sandbox/tools/pipeshub/tool.json to your PipesHub");
  lines.push("   hostname (no scheme, no path). It must be reachable over public HTTPS");
  lines.push("   — QM sandboxes do not run on your machine, so localhost is unreachable.");
  lines.push("");
  lines.push("2. Each person adds two personal keychain entries (service: pipeshub):");
  lines.push("     PIPESHUB_TOKEN     → their PAT (never paste it into chat)");
  lines.push("     PIPESHUB_BASE_URL  → public HTTPS origin, no /mcp path");
  lines.push("   Do NOT put a token in sandbox.secretEnv (org-wide). Do NOT rely on");
  lines.push("   sandbox.env for the URL — it does not reach the sandbox.");
  lines.push("");
  lines.push("Then:  qm check && qm up");
  lines.push("");
  if (r.dockerfileAction !== "skipped-unusable") {
    lines.push("On Sprites, `qm sandbox publish` does not put pipeshub on PATH.");
    lines.push("The skill installs the CLI on first use.");
  }
  return lines.join("\n");
}

export const INIT_QM_EXIT = EXIT.OK;
