---
description: Connect Claude Code to PipesHub (Cloud or self-hosted)
---

Get the `pipeshub` MCP server in this plugin working. Never ask the user to paste a token into chat, and never print one.

1. Check whether `PIPESHUB_MCP_TOKEN` is set in the environment (test only that it is non-empty, e.g. `test -n "$PIPESHUB_MCP_TOKEN" && echo set`). Check `PIPESHUB_MCP_URL` the same way; unset means PipesHub Cloud (`https://app.pipeshub.com/mcp`).
2. If the token is missing, tell the user:
   - No PipesHub yet: sign up at https://app.pipeshub.com (or self-host: https://docs.pipeshub.com/for-agents-local-demo.md).
   - Mint a personal access token in **Workspace → Developer settings**.
   - Export it in their shell profile, outside this chat: `export PIPESHUB_MCP_TOKEN=phpat_...` (plus `export PIPESHUB_MCP_URL=https://<their-instance>/mcp` if self-hosted), then restart Claude Code.
3. If both are set, call `pipeshub_sources`. Sources listed means it works; suggest `/pipeshub:ask <question>`. A 401 means the token is wrong or expired; no sources means nothing is connected or indexed yet, so point them to the PipesHub UI to add a connector or upload files.

Full guide: https://docs.pipeshub.com/for-agents.md
