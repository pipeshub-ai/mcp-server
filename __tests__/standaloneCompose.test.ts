import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SECRET_NAMES, composeFile } from "../src/cli/standalone/assets.js";

// The compose file `pipeshub dev up` writes must pass the settings a laptop owner turns through to the container; without these
// lines `MAX_CONCURRENT_PARSING=6 pipeshub dev up` silently changed nothing.

describe("the pinned compose file", () => {
  const text = composeFile("4.10.0");

  test("the graph runs on Neo4j: a service with no published port, its password only from .env, and the app waits for it", () => {
    const neo4j = text.slice(text.indexOf("\n  neo4j:"), text.indexOf("\nvolumes:"));
    expect(neo4j).toContain("image: ${NEO4J_IMAGE:-neo4j}:${NEO4J_TAG:-5.26.0}");
    expect(neo4j).toContain("NEO4J_PLUGINS: '[\"apoc\"]'");
    expect(neo4j).toContain("NEO4J_server_memory_heap_max__size: 512m");
    expect(neo4j).toContain("NEO4J_server_memory_pagecache_size: 256m");
    expect(neo4j).toContain("pipeshub-neo4j:/data");
    expect(neo4j).toContain("cypher-shell -u neo4j -p $$NEO4J_PASSWORD 'RETURN 1'");
    expect(neo4j).not.toContain("ports:");
    expect(text).toContain("\n  pipeshub-neo4j:\n");
    expect(text).toContain("DATA_STORE: neo4j");
    expect(text).not.toContain("DATA_STORE: postgres");
    expect(text).toContain("NEO4J_URI: bolt://neo4j:7687");
    expect(text).toMatch(/depends_on:[\s\S]*neo4j:\s+condition: service_healthy/);
    // every password is a reference to .env, never a value
    expect(text.match(/NEO4J_(PASSWORD|AUTH): .*/g)).toEqual([
      "NEO4J_PASSWORD: ${NEO4J_PASSWORD:?}", "NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:?}", "NEO4J_PASSWORD: ${NEO4J_PASSWORD:?}",
    ]);
    expect(SECRET_NAMES).toContain("NEO4J_PASSWORD");
    expect(text.split("\n")[1]).toContain("until the PostgreSQL graph store is complete");
  });

  test("the header names the CLI version, not an internal branch", () => {
    expect(text.split("\n")[0]).toContain("CLI version 4.10.0");
    expect(text).not.toMatch(/launch\//);
  });

  test("runs the database on the published pgvector image, tuned through its command line", () => {
    expect(text).toContain("image: ${PG_IMAGE:-pgvector/pgvector}:${PG_TAG:-pg18}");
    expect(text).not.toContain("pipeshubai/postgres");
    expect(text).toContain('"-c", "shared_buffers=${PG_SHARED_BUFFERS:-128MB}"');
  });

  test("passes the record concurrency settings through, empty meaning the image's default", () => {
    expect(text).toContain("MAX_CONCURRENT_PARSING: ${MAX_CONCURRENT_PARSING:-}");
    expect(text).toContain("MAX_CONCURRENT_INDEXING: ${MAX_CONCURRENT_INDEXING:-}");
  });

  // bge-base (768 dimensions) is the default embedding model, run in ONNX batches of 4 chunks: a batch of 16 grows the process by 880 MiB, 4 by 156 MiB.
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
