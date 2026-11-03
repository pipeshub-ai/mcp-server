---
name: setup
description: Sign Cursor in to PipesHub (Cloud or self-hosted)
---

Get the `pipeshub` MCP server in this plugin working. Never ask the user to paste a token into chat, and never print one.

1. Call `pipeshub_sources`. If it answers, the connection works. If it lists sources, check their `coverage` (or run one `pipeshub_search`) before suggesting the `ask` command: a source can be listed while still indexing. No sources means nothing is connected yet, so point the user to the PipesHub UI to add a connector or upload files.
2. If the tools are missing or return 401/"No PipesHub credential", sign the user in. Run `npx -y -p @pipeshub-ai/mcp pipeshub login --no-wait` (add `--url https://<their-instance>` when self-hosted; the default is PipesHub Cloud). Give the user the link and code it prints, and tell them to open the link and approve. Then run `npx -y -p @pipeshub-ai/mcp pipeshub login --wait`.
3. Tell the user to reload the Cursor window (or toggle the `pipeshub` server in Settings, MCP), then check again with `pipeshub_sources`.
4. No PipesHub account yet: sign up at https://app.pipeshub.com/?ref=cursor-plugin, or self-host: https://docs.pipeshub.com/for-agents-local-demo.md.

Alternative to `login`: a personal access token minted in Workspace, Developer settings, exported as `PIPESHUB_TOKEN` in the shell Cursor starts from (outside this chat), together with `PIPESHUB_BASE_URL=https://app.pipeshub.com` (or the self-hosted origin). Test only that they are non-empty, e.g. `test -n "$PIPESHUB_TOKEN" && echo set`.

Full guide: https://docs.pipeshub.com/for-agents.md
