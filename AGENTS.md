# AGENTS.md — @pipeshub-ai/mcp

This file is for coding agents working **in this repository**. It exists so they do not invent `auth set`, put a PAT in QM `sandbox.secretEnv`, or treat QM as an MCP client.

This repository is two products in one package:

- **Remote MCP client library / local stdio server** — `npx @pipeshub-ai/mcp start` talks to a PipesHub instance's `/mcp`.
- **`pipeshub` CLI + QM bundle** — `src/cli/` and `qm/`. QM is an MCP *server* to its own harness; it cannot attach `/mcp`. Agents inside QM run this CLI.

Human setup: [README.md](./README.md), [qm/docs/use-with-qm.md](./qm/docs/use-with-qm.md). Customer-facing agent skill (install into *their* repo, not this one): [skills/pipeshub/SKILL.md](./skills/pipeshub/SKILL.md).

## Build and test

```bash
export PATH="$HOME/.bun/bin:$PATH"   # bun is required
npm run build                        # writes bin/pipeshub.js and the MCP server
npm run lint
bun test
```

The published binary is `bin/pipeshub.js`, not the `tsc` output under `esm/`. CI runs `bun test` after lint.

## Hard rules

- **Never** print, log, echo, or commit a PAT. Compare a 6-char prefix if you must check one. Never ask anyone to paste a token into chat.
- **Do not ship** `auth set`, `auth import`, `--print-token`, or any subcommand that accepts a token as an argument. The CLI reads `PIPESHUB_TOKEN` (then `PIPESHUB_MCP_TOKEN`) from the environment.
- **Do not** put a PAT in QM `sandbox.secretEnv` — that is org-wide and hands one person's token to everyone.
- **Do not** invent `tool.json` field names. Bind to `@yc-software/qm/contract` types.
- **Do not** use OAuth `client_credentials` (no user identity, so permission filters collapse).
- **Do not** add PAT scopes beyond the five-scope preset to make something work. If a command needs more, stop and report — it may be unmintable. Search needs `semantic:write`, not `semantic:read`.
- Cite `file:line` for claims about how PipesHub or QM behaves. Prefer stopping over guessing.

## Layout

| Path | What it is |
| --- | --- |
| `src/cli/` | `pipeshub` binary |
| `src/mcp-server/` | Speakeasy-generated MCP stdio server. Do not hand-edit generated files |
| `qm/` | Deployment-layer bundle `pipeshub init-qm` copies (tools, skill, optional Dockerfile) |
| `skills/pipeshub/` | Skill for *customer* repos. Not auto-loaded here |
| `server.json` | Official MCP registry manifest |

Agent-facing copy for QM lives in `qm/sandbox/skills/pipeshub/SKILL.md`. Operator/security copy lives in `qm/SECURITY.md` and `qm/TROUBLESHOOTING.md`. Exit `6` on `ask` means no citation objects: relay the answer as unsourced and not confirmed; do not restate its claims as fact. `confidence` is a self-score, not a citation proxy.

## CLI contract (v1)

- Env: `PIPESHUB_TOKEN` → `PIPESHUB_MCP_TOKEN`; `PIPESHUB_BASE_URL` → `PIPESHUB_MCP_URL`. Normalize to origin; MCP path is always `{origin}/mcp`.
- Cleartext HTTP only for loopback / RFC1918 / link-local / `.local` / `.internal` / `.svc` / `host.docker.internal`. Public DNS needs HTTPS (`--insecure-http` override).
- Exit codes: `0` ok · `3` unauthenticated · `4` forbidden · `5` rate-limited · `6` no results **or `ask` with no sources**.
- JSON default. `webUrl` + `recordId` on every hit. v1 directory surface is `whoami` only.
