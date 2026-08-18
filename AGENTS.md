# AGENTS.md — @pipeshub-ai/mcp

This file is for coding agents working **in this repository**. It exists so they do not invent `auth set`, put a PAT in QM `sandbox.secretEnv`, or treat QM as an MCP client.

This repository is two products in one package. The npm package is a remote MCP *client library* and an optional local stdio server: `npx @pipeshub-ai/mcp start` talks to a PipesHub instance's `/mcp`. The same package ships the `pipeshub` CLI and the QM bundle (`src/cli/` and `qm/`). QM is an MCP *server* to its own harness; it cannot attach `/mcp`. Agents inside QM run this CLI.

Human setup is in [README.md](./README.md) and [qm/docs/use-with-qm.md](./qm/docs/use-with-qm.md). The customer-facing agent skill (install into *their* repo, not this one) is [skills/pipeshub/SKILL.md](./skills/pipeshub/SKILL.md).

## Build and test

`bun` is required. Put it on `PATH`, then build, lint, and test:

```bash
export PATH="$HOME/.bun/bin:$PATH"
npm run build
npm run lint
bun test
```

`npm run build` writes `bin/pipeshub.js` and the MCP server. The published binary is that file, not the `tsc` output under `esm/`. CI runs `bun test` after lint.

## Hard rules

Never print, log, echo, or commit a PAT. Compare a 6-char prefix if you must check one. Never ask anyone to paste a token into chat.

Do not ship `auth set`, `auth import`, `--print-token`, or any subcommand that accepts a token as an argument. The CLI reads `PIPESHUB_TOKEN` (then `PIPESHUB_MCP_TOKEN`) from the environment.

Do not put a PAT in QM `sandbox.secretEnv`. That variable is org-wide and would hand one person's token to everyone.

Do not invent `tool.json` field names. Bind to `@yc-software/qm/contract` types.

Do not use OAuth `client_credentials`. That grant has no user identity, so permission filters collapse.

Do not add PAT scopes beyond the five-scope preset to make something work. If a command needs more, stop and report — it may be unmintable. Search needs `semantic:write` (`src/funcs/semanticSearchSearch.ts:125`), not `semantic:read` (search history, `src/hooks/oauth2scopes.ts:90-97`).

Cite `file:line` for claims about how PipesHub or QM behaves. Prefer stopping over guessing.

## Layout

| Path | What it is |
| --- | --- |
| `src/cli/` | `pipeshub` binary |
| `src/mcp-server/` | Speakeasy-generated MCP stdio server. Do not hand-edit generated files |
| `qm/` | Deployment-layer bundle `pipeshub init-qm` copies (tools, skill, optional Dockerfile) |
| `skills/pipeshub/` | Skill for *customer* repos. Not auto-loaded here |
| `server.json` | Official MCP registry manifest |

Agent-facing copy for QM lives in `qm/sandbox/skills/pipeshub/SKILL.md`. Operator and security copy lives in `qm/SECURITY.md` and `qm/TROUBLESHOOTING.md`.

Exit `6` on `ask` means the response had no citation objects. Relay the answer as unsourced and not confirmed; do not restate its claims as fact. `confidence` is a self-score, not a citation proxy.

## CLI contract (v1)

Environment: `PIPESHUB_TOKEN` then `PIPESHUB_MCP_TOKEN`; `PIPESHUB_BASE_URL` then `PIPESHUB_MCP_URL`. Normalize the URL to an origin. The MCP path is always `{origin}/mcp`.

Cleartext HTTP is allowed only for loopback, RFC1918, link-local, and names ending in `.local` / `.internal` / `.svc`, plus `host.docker.internal`. Public DNS needs HTTPS (`--insecure-http` override).

Exit codes: `0` ok, `3` unauthenticated, `4` forbidden, `5` rate-limited, `6` no results or `ask` with no sources.

JSON is the default output. Every hit carries `webUrl` and `recordId`. The v1 directory surface is `whoami` only.
