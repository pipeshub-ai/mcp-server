---
description: Connect Claude Code to PipesHub (Cloud, self-hosted, or on this computer)
argument-hint: "[cloud|local]"
---

Get PipesHub working in this session. Never ask the user to paste a token into chat, and never print one.

Mode: "$ARGUMENTS". If it is neither `cloud` nor `local`, ask the user which they want:

- **Cloud**: PipesHub Cloud, or their company's own PipesHub server. Uses a personal access token.
- **Local**: PipesHub runs on this computer (Docker) and indexes this repository.

## Cloud

1. Check whether `PIPESHUB_MCP_TOKEN` is set in the environment (test only that it is non-empty, e.g. `test -n "$PIPESHUB_MCP_TOKEN" && echo set`). Check `PIPESHUB_MCP_URL` the same way; unset means PipesHub Cloud (`https://app.pipeshub.com/mcp`).
2. If the token is missing, tell the user:
   - No PipesHub yet: sign up at https://app.pipeshub.com/?ref=claude-code-plugin, or choose local mode.
   - Mint a personal access token in **Workspace → Developer settings**.
   - Export it in their shell profile, outside this chat: `export PIPESHUB_MCP_TOKEN=phpat_...` (plus `export PIPESHUB_MCP_URL=https://<their-instance>/mcp` if self-hosted), then restart Claude Code.
3. If the token is set (with or without `PIPESHUB_MCP_URL`), call `pipeshub_sources`. Sources listed means it works; suggest `/pipeshub:ask <question>`, and `/pipeshub:index` to add this repository's code. A 401 means the token is wrong or expired; no sources means nothing is connected or indexed yet, so point them to the PipesHub UI to add a connector or upload files.

## Local

1. Run this with a 10-minute timeout (the first start downloads the images):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/pipeshub-local.mjs" setup
   ```

   It runs `pipeshub init --local --client claude-code`: it starts PipesHub with Docker (or uses the one already running), signs in on this computer, adds a `pipeshub` MCP server to Claude Code, and indexes this repository. If it prints a link and a code, give both to the user.
2. If it says the local runtime is not installed, tell the user that, with the self-hosting guide it names, and stop. If it fails for another reason, relay the error and its next step.
3. On success, tell the user to restart Claude Code. The plugin's Cloud server (`plugin:pipeshub:pipeshub` in `/mcp`) needs `PIPESHUB_MCP_TOKEN`; without it, it shows as failed, and they can turn it off in `/mcp`. After a restart, `/pipeshub:ask` answers from PipesHub and `/pipeshub:index` re-indexes this repository after big changes.

Full guide: https://docs.pipeshub.com/for-agents.md
