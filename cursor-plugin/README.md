# PipesHub for Cursor

Permissioned search and cited answers over your workplace sources (Slack, Drive, Gmail, Jira, Confluence, and more), from inside Cursor. The plugin adds:

- the `pipeshub` MCP server (the local `@pipeshub-ai/mcp` stdio server),
- `pipeshub-docs`, the PipesHub documentation search server,
- the `pipeshub` skill, and the `ask` and `setup` commands.

## Install

A Cursor team admin imports this repository as a team marketplace: Dashboard → Plugins & MCPs → Team Marketplaces → Add Marketplace → Import from Repo, with the repository root `https://github.com/pipeshub-ai/mcp-server` (the marketplace file is `.cursor-plugin/marketplace.json`; the plugin lives in `cursor-plugin/`). Each developer then installs **PipesHub** from Customize, unless the admin sets it Default On or Required. It is not yet listed in Cursor's public marketplace.

## Sign in

No token goes into Cursor's MCP configuration: `pipeshub login` keeps its sign-in in `~/.config/pipeshub/credentials.json` (mode 0600) and refreshes it. Run the `setup` command in Cursor, or yourself:

```bash
npx -y -p @pipeshub-ai/mcp pipeshub login --no-wait   # prints a link and a code; open it and approve
npx -y -p @pipeshub-ai/mcp pipeshub login --wait
```

Then reload the Cursor window. The server uses that sign-in, and talks to the instance you signed in to (PipesHub Cloud by default).

## Self-hosted

Sign in with `pipeshub login --url https://<your-instance> --no-wait` (then `--wait`). The server follows the sign-in's address, so the plugin config needs no change.

To use a personal access token instead, export `PIPESHUB_TOKEN` and `PIPESHUB_BASE_URL=https://<your-instance>` in the shell Cursor starts from. Never paste a token into chat.

Docs: https://docs.pipeshub.com/for-agents
