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
    // Neo4j reads every NEO4J_* variable as a setting and refuses to start on an unknown one, so the password is only in NEO4J_AUTH.
    expect(neo4j).toContain("cypher-shell -u neo4j -p \\\"$${NEO4J_AUTH#neo4j/}\\\" 'RETURN 1'");
    expect(neo4j).not.toContain("ports:");
    expect(text).toContain("\n  pipeshub-neo4j:\n");
    expect(text).toContain("DATA_STORE: neo4j");
    expect(text).not.toContain("DATA_STORE: postgres");
    expect(text).toContain("NEO4J_URI: bolt://neo4j:7687");
    expect(text).toMatch(/depends_on:[\s\S]*neo4j:\s+condition: service_healthy/);
    // every password is a reference to .env, never a value
    expect(text.match(/NEO4J_(PASSWORD|AUTH): .*/g)).toEqual([
      "NEO4J_PASSWORD: ${NEO4J_PASSWORD:?}", "NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:?}",
    ]);
    expect(SECRET_NAMES).toContain("NEO4J_PASSWORD");
    expect(text.split("\n")[1]).toContain("until the PostgreSQL graph store is complete");
  });

  test("the header names the CLI version, not an internal branch", () => {
    expect(text.split("\n")[0]).toContain("CLI version 4.10.0");
    expect(text).not.toMatch(/launch\//);
  });

  test("runs the database on the repository's PostgreSQL image, which creates its own roles, and migrates before the app starts", () => {
    expect(text).toContain("image: ${PG_IMAGE:-pipeshubai/postgres}:${PG_TAG:-18-1}");
    expect(text).not.toContain("pgvector/pgvector");
    expect(text).toContain("PG_SHARED_BUFFERS: ${PG_SHARED_BUFFERS:-128MB}");
    // the image refuses to start on an empty password, and the roles it creates are the ones the app logs in as
    for (const n of ["NODE", "CONNECTORS", "INDEXING", "QUERY", "KV", "JOBS", "MIGRATE", "BACKUP"]) expect(text).toContain(`PG_${n}_PASSWORD: \${PG_${n}_PASSWORD:?}`);
    expect(text).toContain("image: ${PIPESHUB_MIGRATE_IMAGE:-pipeshubai/pipeshub-migrate}:${MIGRATE_TAG:-latest}");
    expect(text).toMatch(/pipeshub-migrate:\s+image:[\s\S]*depends_on:\s+postgres:\s+condition: service_healthy/);
    expect(text).toMatch(/pipeshub-slim:[\s\S]*depends_on:\s+pipeshub-migrate:\s+condition: service_completed_successfully/);
  });

  test("a placement worker runs from the migration image, as the migrate and jobs logins, once the migration is done", () => {
    const w = text.slice(text.indexOf("\n  pipeshub-placement:"), text.indexOf("\n  neo4j:"));
    expect(w).toContain("image: ${PIPESHUB_MIGRATE_IMAGE:-pipeshubai/pipeshub-migrate}:${MIGRATE_TAG:-latest}");
    expect(w).toContain('command: ["python", "-m", "db.maintain", "placement", "--watch", "1"]');
    expect(w).toContain("PG_MIGRATE_URL: postgresql+psycopg://pipeshub_migrate:");
    expect(w).toContain("PG_JOBS_URL: postgresql://pipeshub_jobs:");
    expect(w).toMatch(/depends_on:\s+pipeshub-migrate:\s+condition: service_completed_successfully/);
  });

  test("each service logs in as its own PostgreSQL role, direct (no pooler), with no administrator or migrate password in the app", () => {
    const app = text.slice(text.indexOf("\n  pipeshub-slim:"), text.indexOf("\n  postgres:"));
    for (const [v, role] of [["PG_NODE_URL", "node_login"], ["PG_JOBS_URL", "jobs"], ["PG_CORE_URL", "kv_login"], ["PG_CORE_CONNECTORS_URL", "connectors_login"],
      ["PG_CORE_INDEXING_URL", "indexing_login"], ["PG_CORE_QUERY_URL", "query_login"]] as const) expect(app).toContain(`${v}: postgresql://pipeshub_${role}:`);
    // without these the Node API has no address for the Python services ("connectorBackend URL is not configured")
    for (const [v, port] of [["QUERY_BACKEND", 8000], ["CONNECTOR_BACKEND", 8088], ["INDEXING_BACKEND", 8091], ["EMBEDDING_SERVER_URL", 8002]] as const) expect(app).toContain(`${v}: http://localhost:${port}`);
    expect(app).toContain("PG_POOLER: none");
    expect(app).toContain("PGVECTOR_POOLER: none");
    expect(app).toContain("PGVECTOR_JOBS_DSN: postgresql://pipeshub_jobs:");
    expect(app).not.toContain("PG_ADMIN_PASSWORD");
    expect(app).not.toContain("PG_MIGRATE_PASSWORD");
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
