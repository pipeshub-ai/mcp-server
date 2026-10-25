// Files `pipeshub init` and `pipeshub dev` write: the pinned slim compose file
// and the text the agents read. Compose variables are written `@{VAR}` here and
// turned into `${VAR}` below, so they are not read as template-literal holes.

/**
 * The slim stack: the app and PostgreSQL with pgvector, nothing else. This is
 * the compose file of the `launch/slim` branch of pipeshub-ai (deployment/slim,
 * commit 339269b1e: device sign-in fix, OAUTH_ISSUER, write scopes) with the `build:` sections removed, so no repository
 * checkout is needed, and the image names overridable from the environment.
 *
 * shortcut: the default image tags are the names that branch uses and are not
 * published yet. Pin the published tags here (or set PIPESHUB_IMAGE/IMAGE_TAG/
 * PG_IMAGE/PG_IMAGE_REV) before the package is published.
 */
export const COMPOSE_REVISION = "launch/slim-local-auth@339269b1e";

const COMPOSE = `# PipesHub standalone (slim): the app and PostgreSQL, nothing else. Written by 'pipeshub dev up'; ${COMPOSE_REVISION}.
# Secrets are in .env next to this file (mode 0600). Ports bind to loopback only.
name: @{PIPESHUB_PROJECT:-pipeshub-slim}

services:
  pipeshub-slim:
    image: @{PIPESHUB_IMAGE:-pipeshubai/pipeshub-ai}:@{IMAGE_TAG:-slim}
    restart: unless-stopped
    stop_grace_period: 30s
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "127.0.0.1:@{PIPESHUB_PORT:-3000}:3000"
    volumes:
      - pipeshub-data:/data/pipeshub
      - @{PIPESHUB_WORKSPACE:-./workspace}:/workspace:ro
    mem_limit: @{APP_MEMORY_LIMIT:-4g}
    environment:
      NODE_ENV: production
      LOG_LEVEL: @{LOG_LEVEL:-info}
      SECRET_KEY: @{SECRET_KEY:?run pipeshub dev up}
      JWT_SECRET: @{JWT_SECRET:?}
      SCOPED_JWT_SECRET: @{SCOPED_JWT_SECRET:?}
      COOKIE_SECRET: @{COOKIE_SECRET:?}
      FRONTEND_PUBLIC_URL: http://localhost:@{PIPESHUB_PORT:-3000}
      # The address discovery advertises: the one the CLI is pointed at (127.0.0.1 on the published port).
      OAUTH_ISSUER: @{OAUTH_ISSUER:-http://127.0.0.1:@{PIPESHUB_PORT:-3000}}
      # A local single-user laptop: the stock scopes plus the write ones, so agent write tools and pipeshub index work. kb:delete stays off. offline_access gives the login a refresh token (an older base lacks it).
      MCP_SCOPES: @{MCP_SCOPES:-openid,profile,email,offline_access,semantic:write,conversation:write,conversation:chat,kb:read,kb:write,kb:upload,team:read,user:read,usergroup:read,config:read,agent:read,agent:execute,connector:read,code:read,code:write}
      AGENT_EXTRA_SCOPES: @{AGENT_EXTRA_SCOPES:-kb:write,kb:upload,code:write,offline_access}
      DATA_STORE: postgres
      DOC_STORE: postgres
      VECTOR_DB_TYPE: pgvector
      KV_STORE_TYPE: postgres
      MESSAGE_BROKER: postgres
      REDIS_MODE: postgres
      CRAWL_SCHEDULER: postgres
      PG_HOST: postgres
      PG_ADMIN_PASSWORD: @{PG_ADMIN_PASSWORD:?}
      PG_NODE_PASSWORD: @{PG_NODE_PASSWORD:?}
      PG_CONNECTORS_PASSWORD: @{PG_CONNECTORS_PASSWORD:?}
      PG_INDEXING_PASSWORD: @{PG_INDEXING_PASSWORD:?}
      PG_QUERY_PASSWORD: @{PG_QUERY_PASSWORD:?}
      PG_KV_PASSWORD: @{PG_KV_PASSWORD:?}
      PG_JOBS_PASSWORD: @{PG_JOBS_PASSWORD:?}
      PG_MIGRATE_PASSWORD: @{PG_MIGRATE_PASSWORD:?}
      PIPESHUB_FOLDER_ROOTS: /workspace
      EMBEDDING_BACKEND: fastembed
      DEFAULT_EMBEDDING_MODEL: @{DEFAULT_EMBEDDING_MODEL:-BAAI/bge-small-en-v1.5}
      OMP_NUM_THREADS: @{OMP_NUM_THREADS:-2}
      TELEMETRY_COLLECTION_FLAG: @{TELEMETRY_COLLECTION_FLAG:-}
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://127.0.0.1:3000/api/v1/health"]
      interval: 10s
      timeout: 3s
      retries: 12
      start_period: 40s

  postgres:
    image: @{PG_IMAGE:-pipeshubai/postgres}:@{PG_MAJOR:-18}-@{PG_IMAGE_REV:-1}
    restart: unless-stopped
    shm_size: 256m
    mem_limit: @{PG_MEMORY_LIMIT:-1g}
    environment:
      POSTGRES_DB: pipeshub
      POSTGRES_PASSWORD: @{PG_ADMIN_PASSWORD:?}
      PGDATA: /var/lib/postgresql/data
      PG_SHARED_BUFFERS: @{PG_SHARED_BUFFERS:-128MB}
      PG_MAX_CONNECTIONS: @{PG_MAX_CONNECTIONS:-120}
      PG_AUTOVACUUM_WORK_MEM: @{PG_AUTOVACUUM_WORK_MEM:-32MB}
      PG_MAINTENANCE_WORK_MEM: @{PG_MAINTENANCE_WORK_MEM:-64MB}
      PG_NODE_PASSWORD: @{PG_NODE_PASSWORD:?}
      PG_CONNECTORS_PASSWORD: @{PG_CONNECTORS_PASSWORD:?}
      PG_INDEXING_PASSWORD: @{PG_INDEXING_PASSWORD:?}
      PG_QUERY_PASSWORD: @{PG_QUERY_PASSWORD:?}
      PG_KV_PASSWORD: @{PG_KV_PASSWORD:?}
      PG_JOBS_PASSWORD: @{PG_JOBS_PASSWORD:?}
      PG_MIGRATE_PASSWORD: @{PG_MIGRATE_PASSWORD:?}
      PG_BACKUP_PASSWORD: @{PG_MIGRATE_PASSWORD:?}
    volumes:
      - pipeshub-pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "pipeshub"]
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  pipeshub-data:
  pipeshub-pg:
`.replaceAll("@{", "${");

export const composeFile = (): string => COMPOSE;

/** Names the .env must define (12 secrets); `dev up` generates each once and never rewrites it. */
export const SECRET_NAMES = [
  "SECRET_KEY", "JWT_SECRET", "SCOPED_JWT_SECRET", "COOKIE_SECRET",
  "PG_ADMIN_PASSWORD", "PG_NODE_PASSWORD", "PG_CONNECTORS_PASSWORD", "PG_INDEXING_PASSWORD",
  "PG_QUERY_PASSWORD", "PG_KV_PASSWORD", "PG_JOBS_PASSWORD", "PG_MIGRATE_PASSWORD",
] as const;

/** Written into a file that is wholly ours; uninstall deletes only files that carry it. */
export const OWNED = "managed by pipeshub init";
export const BLOCK_BEGIN = "<!-- pipeshub:begin (managed by pipeshub init; remove with: pipeshub init --uninstall) -->";
export const BLOCK_END = "<!-- pipeshub:end -->";

const DESCRIPTION =
  "Search the PipesHub running on this computer: the team's indexed documents, tickets and chat, and (once this repository is indexed) its code. "
  + "Use it before answering from memory when a question is about this project's history, decisions or who owns something.";

const GUIDANCE = `PipesHub is connected as the MCP server \`pipeshub\` and runs on this computer.

- For a question about what the team knows (decisions, tickets, docs, chat, who owns what), call \`pipeshub_search\`, then read the records that matter with \`pipeshub_get_record_content\`, and answer from what they say. Do not answer from memory.
- Try other wording when the first search misses. For "all" or "how many", do not stop at the first matches.
- If the \`pipeshub_code_*\` tools are listed, use them for questions about this repository's code (callers, callees, impact) before reading many files.
- If a tool says PipesHub is not reachable, tell the user to run \`pipeshub dev up\`.`;

/** The text between the markers of an AGENTS.md / CLAUDE.md / GEMINI.md / .rules block. */
export const blockBody = (): string => `## PipesHub\n\n${GUIDANCE}`;

/** A whole-file skill or rule: YAML front matter first (clients read it from byte 0), then the guidance. */
export function ruleFile(kind: "skill" | "cursor" | "windsurf" | "vscode" | "cline"): string {
  const body = `\n<!-- ${OWNED} -->\n\n# PipesHub\n\n${GUIDANCE}\n`;
  switch (kind) {
    case "skill":
      return `---\nname: pipeshub\ndescription: ${DESCRIPTION}\n---\n${body}`;
    case "cursor":
      return `---\ndescription: ${DESCRIPTION}\nalwaysApply: false\n---\n${body}`;
    case "windsurf":
      return `---\ntrigger: model_decision\ndescription: ${DESCRIPTION}\n---\n${body}`;
    case "vscode":
      return `---\ndescription: ${DESCRIPTION}\n---\n${body}`;
    case "cline":
      return body.trimStart();
  }
}
