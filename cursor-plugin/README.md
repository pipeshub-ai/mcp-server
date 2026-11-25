# PipesHub for Cursor

Permissioned search and cited answers over your workplace sources (Slack, Drive, Gmail, Jira, Confluence, and more), from inside Cursor. The plugin adds:

- the `pipeshub` MCP server (PipesHub Cloud's remote server, `https://app.pipeshub.com/mcp`, signed in with OAuth),
- `pipeshub-docs`, the PipesHub documentation search server,
- the `pipeshub` skill, and the `ask` and `setup` commands.

## Install

A Cursor team admin imports this repository as a team marketplace: Dashboard → Plugins & MCPs → Team Marketplaces → Add Marketplace → Import from Repo, with the repository root `https://github.com/pipeshub-ai/mcp-server` (the marketplace file is `.cursor-plugin/marketplace.json`; the plugin lives in `cursor-plugin/`). Each developer then installs **PipesHub** from Customize, unless the admin sets it Default On or Required. It is not yet listed in Cursor's public marketplace.

## Sign in

No token goes into any config file. After installing, open Cursor Settings → Tools & MCP, find `pipeshub`, and click **Connect**. Cursor registers itself with PipesHub (dynamic client registration), opens the PipesHub sign-in and consent page, and keeps and refreshes the token itself. The `setup` command walks through this.

Until you connect, the `pipeshub` server shows as needing authentication and lists no tools.

## Self-hosted

The plugin's server points at PipesHub Cloud. For your own instance, add an entry to your user config, `~/.cursor/mcp.json` (plugin updates never touch it):

```json
{ "mcpServers": { "pipeshub": { "url": "https://<your-instance>/mcp" } } }
```

Then choose it as the source for `pipeshub` in that server's settings (or turn the plugin's `pipeshub` server off) and click **Connect**. Your instance must allow dynamic client registration. PipesHub v1.1.0 and older have it off unless `PIPESHUB_ENABLE_DCR=true` is set; later releases have it on unless `PIPESHUB_ENABLE_DCR=false`. With it off, Connect fails with 403 `dynamic client registration is disabled`; use a static OAuth app as described in the [main README](../README.md).

To run the local stdio server instead (`pipeshub login` plus `npx @pipeshub-ai/mcp start`), use `pipeshub mcp install --client cursor`.

Docs: https://docs.pipeshub.com/for-agents
