/// <reference types="bun-types" />

// `@pipeshub-ai/standalone` is a second package in this repository
// (standalone/package.json) whose only bin, `pipeshub`, is the same CLI source
// bundled again, so there is one CLI and nothing to keep in step. It is not an
// npm workspace: it has no dependencies to install, and a separate package.json
// is what lets it publish under another name while keeping the `pipeshub` command.

import { build } from "bun";
import { chmod } from "node:fs/promises";

await build({
  entrypoints: ["./src/cli/pipeshub.ts"],
  outdir: "./standalone/bin",
  sourcemap: "none",
  target: "node",
  format: "esm",
  minify: false,
  throw: true,
  banner: "#!/usr/bin/env node",
}).catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
await chmod("./standalone/bin/pipeshub.js", 0o755);
