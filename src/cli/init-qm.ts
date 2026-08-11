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

export interface InitResult {
  written: string[];
  skipped: string[];
  dockerfileAction: "created" | "appended" | "manual";
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
  if (!await exists(dockerfile)) {
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

  // Do not swallow this. The fragment carries the `sandbox.env` block the
  // operator must merge in, so reporting a successful init without it leaves
  // them with a scaffold that cannot reach PipesHub and no sign of why.
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

  return { written, skipped, dockerfileAction, version, configFragment };
}

export function renderInitReport(dest: string, r: InitResult): string {
  const lines: string[] = [];
  lines.push(`Scaffolded the PipesHub bundle into ${dest}`);
  lines.push(`CLI version pinned: ${r.version}`);
  lines.push("");
  for (const f of r.written) lines.push(`  wrote   ${f}`);
  for (const f of r.skipped) lines.push(`  kept    ${f}  (already existed — use --force to replace)`);
  lines.push("");

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
  lines.push("1. Set your PipesHub origin in qm.config.jsonc. It must be a PUBLIC");
  lines.push("   HTTPS address — QM sandboxes do not run on your machine, so");
  lines.push("   localhost and LAN addresses are unreachable from them:");
  lines.push("");
  lines.push('     "sandbox": {');
  lines.push('       "env": { "PIPESHUB_BASE_URL": "https://pipeshub.your-company.com" }');
  lines.push("     }");
  lines.push("");
  lines.push("   Do NOT put anyone's token in sandbox.secretEnv — that is org-wide and");
  lines.push("   would hand one person's credential to everybody. Each person adds");
  lines.push("   their own to their own keychain (service: pipeshub, kind: env).");
  lines.push("");
  lines.push("2. Set `egress` in sandbox/tools/pipeshub/tool.json to your hostname,");
  lines.push("   then run:  qm check && qm sandbox publish && qm up");
  return lines.join("\n");
}

export const INIT_QM_EXIT = EXIT.OK;
