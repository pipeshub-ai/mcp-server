---
name: setup
description: Sign Cursor in to PipesHub (Cloud or self-hosted)
---

Get the `pipeshub` MCP server in this plugin working. Never ask the user to paste a token into chat, and never print one.

1. Call `pipeshub_sources`. If it answers, the connection works. If it lists sources, check their `coverage` (or run one `pipeshub_search`) before suggesting the `ask` command: a source can be listed while still indexing. No sources means nothing is connected yet, so point the user to the PipesHub UI to add a connector or upload files.
2. If the `pipeshub` tools are missing, or the server shows "Needs authentication" / a 401, the user has not signed in yet. The plugin connects to PipesHub Cloud (`https://app.pipeshub.com/mcp`) over OAuth: tell the user to open Cursor Settings, Tools & MCP (or Customize), find `pipeshub`, and click **Connect** (or **Login**). Cursor registers itself with PipesHub and opens the PipesHub sign-in and consent page in the browser. After they approve, check again with `pipeshub_sources`.
3. Self-hosted PipesHub: the plugin's server points at Cloud. Tell the user to add their own entry to `~/.cursor/mcp.json` (their file; plugin updates do not touch it), then pick it as the source for `pipeshub` in that server's settings, or turn the plugin's `pipeshub` server off:

   ```json
   { "mcpServers": { "pipeshub": { "url": "https://<their-instance>/mcp" } } }
   ```

   Their instance must allow dynamic client registration. PipesHub v1.1.0 and older have it off unless the operator sets `PIPESHUB_ENABLE_DCR=true`; later releases have it on unless `PIPESHUB_ENABLE_DCR=false`. If it is off (Connect fails with 403 `dynamic client registration is disabled`), use the static OAuth app setup in https://docs.pipeshub.com/for-agents.md instead.
4. No PipesHub account yet: sign up at https://app.pipeshub.com/?ref=cursor-plugin, or self-host: https://docs.pipeshub.com/for-agents-local-demo.md.

Full guide: https://docs.pipeshub.com/for-agents.md
