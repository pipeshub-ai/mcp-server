// Files `pipeshub init` and `pipeshub dev` write: the pinned slim compose file
// and the text the agents read. Compose variables are written `@{VAR}` here and
// turned into `${VAR}` below, so they are not read as template-literal holes.

/**
 * The slim stack: the app and PostgreSQL with pgvector, nothing else. This is
 * the compose file of the `launch/slim` branch of pipeshub-ai (deployment/slim,
 * the integration of the local sign-in fixes and local repository indexing: device sign-in, OAUTH_ISSUER, write scopes) with the `build:` sections removed, so no repository
 * checkout is needed, and the image names overridable from the environment.
 *
 * shortcut: the default image tags are the names that branch uses and are not
 * published yet. Pin the published tags here (or set PIPESHUB_IMAGE/IMAGE_TAG/
 * PG_IMAGE/PG_IMAGE_REV) before the package is published.
 */
export const COMPOSE_REVISION = "launch/l9-integration";

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
      DEFAULT_EMBEDDING_MODEL: @{DEFAULT_EMBEDDING_MODEL:-BAAI/bge-base-en-v1.5}
      # Chunks per ONNX run: bge-base grows the process by 880 MiB at 16, 156 MiB at 4 and 25 MiB at 1 (D-80).
      EMBEDDING_SERVER_BATCH_SIZE: @{EMBEDDING_SERVER_BATCH_SIZE:-4}
      # Records parsed / indexed at once; empty = the image's default (4 and 6), sized for a 4 GB container.
      MAX_CONCURRENT_PARSING: @{MAX_CONCURRENT_PARSING:-}
      MAX_CONCURRENT_INDEXING: @{MAX_CONCURRENT_INDEXING:-}
      OMP_NUM_THREADS: @{OMP_NUM_THREADS:-2}
      # Models already on disk load without the network; HF_HUB_OFFLINE=1 forbids any download.
      HF_HUB_OFFLINE: @{HF_HUB_OFFLINE:-}
      # Client connections per pool; the sum for the worst case (73) is worked out in the server's slim-start.sh against max_connections 120.
      PG_POOL_MAX: @{PG_POOL_MAX:-4}
      PG_JOBS_POOL_MAX: @{PG_JOBS_POOL_MAX:-2}
      # shadow logs an org-scoped access with no org bound; enforce refuses it.
      ORG_CONTEXT_MODE: @{ORG_CONTEXT_MODE:-shadow}
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
  "Search the PipesHub running on this computer: the team's documents, tickets and chat, and this repository's code (callers, impact, definitions). "
  + "Use it before answering from memory about this project's history, decisions, owners or code structure.";

const GUIDANCE = `PipesHub runs on this computer and is connected as the MCP server \`pipeshub\`.

**What the team knows** (decisions, tickets, docs, chat, owners): call \`pipeshub_search\`, read the records that matter with \`pipeshub_get_record_content\`, and answer from them, not from memory. Try other wording when a search misses; for "all" or "how many", do not stop at the first hits.

**This repository's code**:
- Not indexed yet, or changed a lot since? Call \`index_workspace\` first (incremental, safe to repeat). The \`pipeshub_code_*\` tools appear once a repository is indexed.
- Who calls X, what X calls, what breaks if it changes: \`pipeshub_code_neighbours\`, \`pipeshub_code_impact\`.
- Where X is defined: \`pipeshub_code_search\`. A string or regex needs \`mode\` and \`path\`.
- A map: \`pipeshub_code_symbols\` on a directory, \`pipeshub_code_entry_points\`, \`pipeshub_code_outline\` for one file. Then \`pipeshub_code_read\` one symbol or line range.
- Read files yourself for what you are about to edit: the indexed copy can lag.

Keep calls small: set \`limit\`, use \`depth\` 1 or 2, outline before read, a symbol or line range, not a whole file.
Cite what you found as repo, file path and line range. If a result has a \`coverage\` note, say the answer may be incomplete.
If a tool says PipesHub is not reachable, tell the user to run \`npx @pipeshub-ai/standalone dev up\`.`;

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

/**
 * Slash commands, for the clients that document them: Claude Code
 * (https://code.claude.com/docs/en/slash-commands, ~/.claude/commands/*.md) and Gemini CLI
 * (https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md, ~/.gemini/commands/<ns>/*.toml).
 * Both are one short prompt that names the tool; the skill carries the rest.
 */
const INDEX_PROMPT =
  "Call the `index_workspace` tool of the `pipeshub` MCP server for the current working directory (pass it as `path`). "
  + "Report the files sent, the state and whether the `pipeshub_code_*` tools are listed now. "
  + "On an error, show it and suggest running `npx @pipeshub-ai/standalone index` in the repository.";
const CODE_PROMPT =
  "Answer this question about the code in the current repository with the `pipeshub_code_*` tools of the `pipeshub` MCP server: ";
const CODE_TAIL =
  ". Call `index_workspace` first if the repository is not indexed. Keep calls small and cite repo, file path and line range.";

export type CommandName = "index" | "code";

export function commandFile(client: "claude-code" | "gemini", name: CommandName): string {
  const code = name === "code";
  const description = code ? "Ask about this repository's code with PipesHub" : "Index this repository into PipesHub";
  if (client === "claude-code") {
    const head = `---\ndescription: ${description}\n${code ? "argument-hint: <question>\n" : ""}---\n\n<!-- ${OWNED} -->\n\n`;
    return head + (code ? `${CODE_PROMPT}$ARGUMENTS${CODE_TAIL}\n` : `${INDEX_PROMPT}\n`);
  }
  const prompt = code ? `${CODE_PROMPT}{{args}}${CODE_TAIL}` : INDEX_PROMPT;
  return `# ${OWNED}\ndescription = ${JSON.stringify(description)}\nprompt = ${JSON.stringify(prompt)}\n`;
}
