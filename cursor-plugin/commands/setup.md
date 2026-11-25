---
name: setup
description: Sign Cursor in to PipesHub (Cloud or self-hosted)
---

Get the `pipeshub` MCP server in this plugin working. Never ask the user to paste a token into chat, and never print one.

1. Call `pipeshub_sources`. If it answers, the connection works. If it lists sources, check their `coverage` (or run one `pipeshub_search`) before suggesting the `ask` command: a source can be listed while still indexing. No sources means nothing is connected yet, so point the user to the PipesHub UI to add a connector or upload files.
2. If the `pipeshub` server shows **Error** right after install, its URL is not set: Cursor does not ask for plugin variables on an individual install. Tell the user to open Customize, PipesHub, click **Configure**, enter **PipesHub MCP URL** (`<pipeshub-instanceurl>/mcp`; the ⓘ next to the field shows the format), and click **Save**.
3. If the server shows **Needs authentication**, the user has not signed in yet: tell them to click **Authenticate** next to `pipeshub` (Customize, PipesHub). Cursor registers itself with PipesHub and opens the PipesHub consent page in the browser; after they click **Allow**, the browser shows "Authorization complete" and the tools appear. Check again with `pipeshub_sources`. If the server shows **Error · Unauthorized** after signing in (seen once right after a first sign-in, while the tool list had loaded), the stored token was refused: tell the user to click **Sign out** in that server's settings (Customize, PipesHub, `pipeshub`) and **Authenticate** again, or click **Reload**.
4. Self-hosted PipesHub: the user enters `https://<instance>/mcp` as the **PipesHub MCP URL** in step 2; on a team install, a team admin sets it in the Cursor dashboard (Plugins, **Configure**). As an alternative, the user can add their own entry to `~/.cursor/mcp.json` (their file; plugin updates do not touch it), then pick it as the source for `pipeshub` in that server's settings, or turn the plugin's `pipeshub` server off:

   ```json
   { "mcpServers": { "pipeshub": { "url": "https://<their-instance>/mcp" } } }
   ```

   Their instance must allow dynamic client registration. PipesHub v1.1.0 and older have it off unless the operator sets `PIPESHUB_ENABLE_DCR=true`; later releases have it on unless `PIPESHUB_ENABLE_DCR=false`. If it is off (Connect fails with 403 `dynamic client registration is disabled`), use the static OAuth app setup in https://docs.pipeshub.com/for-agents.md instead.
5. No PipesHub account yet: sign up at https://app.pipeshub.com/?ref=cursor-plugin, or run PipesHub on this computer: `npx @pipeshub-ai/standalone init --local --client cursor` (needs Docker) starts it, signs in, and indexes this repository; then reload the window. If npm reports that package as not found, the local runtime is not available yet: self-host with https://docs.pipeshub.com/for-agents-local-demo.md instead.

Full guide: https://docs.pipeshub.com/for-agents.md
