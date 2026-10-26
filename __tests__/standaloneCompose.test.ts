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

  // D-80: bge-base (768 dimensions) is the default embedding model, run in ONNX batches of 4 chunks (880 MiB of growth at 16, 156 at 4).
  test("defaults to the bge-base embedding model and a batch of 4 chunks", () => {
    expect(text).toContain("DEFAULT_EMBEDDING_MODEL: ${DEFAULT_EMBEDDING_MODEL:-BAAI/bge-base-en-v1.5}");
    expect(text).toContain("EMBEDDING_SERVER_BATCH_SIZE: ${EMBEDDING_SERVER_BATCH_SIZE:-4}");
    expect(text).not.toContain("bge-small");
  });

  // Compared with the server repository's slim compose when its checkout is given (SLIM_COMPOSE=<path>, else the sibling `pipeshub-ai`).
  const repoCompose = process.env["SLIM_COMPOSE"] ?? join(import.meta.dir, "..", "..", "pipeshub-ai", "deployment", "slim", "docker-compose.yml");
  test.skipIf(!existsSync(repoCompose))("sets every environment variable the repository's slim compose sets", () => {
    const names = (t: string) => new Set([...t.matchAll(/^ {6}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]!));
    const ours = names(text);
    expect([...names(readFileSync(repoCompose, "utf8"))].filter((n) => !ours.has(n))).toEqual([]);
  });

  test.skipIf(!existsSync(repoCompose))("defaults to the same embedding model as the repository's slim compose", () => {
    const model = (t: string) => t.match(/DEFAULT_EMBEDDING_MODEL: \$\{DEFAULT_EMBEDDING_MODEL:-([^}]+)\}/)?.[1];
    expect(model(text)).toBe(model(readFileSync(repoCompose, "utf8")));
  });
});
