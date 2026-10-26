import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { composeFile } from "../src/cli/standalone/assets.js";

// The compose file `pipeshub dev up` writes must pass the settings a laptop owner turns through to the container; without these
// lines `MAX_CONCURRENT_PARSING=6 pipeshub dev up` silently changed nothing.

describe("the pinned compose file", () => {
  const text = composeFile();

  test("passes the record concurrency settings through, empty meaning the image's default", () => {
    expect(text).toContain("MAX_CONCURRENT_PARSING: ${MAX_CONCURRENT_PARSING:-}");
    expect(text).toContain("MAX_CONCURRENT_INDEXING: ${MAX_CONCURRENT_INDEXING:-}");
  });

  // Compared with the server repository's slim compose when its checkout is given (SLIM_COMPOSE=<path>, else the sibling `pipeshub-ai`).
  const repoCompose = process.env["SLIM_COMPOSE"] ?? join(import.meta.dir, "..", "..", "pipeshub-ai", "deployment", "slim", "docker-compose.yml");
  test.skipIf(!existsSync(repoCompose))("sets every environment variable the repository's slim compose sets", () => {
    const names = (t: string) => new Set([...t.matchAll(/^ {6}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]!));
    const ours = names(text);
    expect([...names(readFileSync(repoCompose, "utf8"))].filter((n) => !ours.has(n))).toEqual([]);
  });
});
