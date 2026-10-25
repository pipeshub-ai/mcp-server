# @pipeshub-ai/standalone

PipesHub on your own computer, connected to your coding agents, in three commands.

```bash
npx @pipeshub-ai/standalone init      # start PipesHub (Docker), sign in, set up your agents
# restart your coding agent, then ask it about your team's documents and tickets
npx @pipeshub-ai/standalone index     # optional: push this git repository into the code graph
```

`init` finds a PipesHub on this computer or starts one with Docker Compose, creates the first account if
the stack is new, and signs in. The sign-in is kept in the CLI's own credential file
(`~/.config/pipeshub/credentials.json`, mode 0600) and never written into an agent's config. For each agent
it finds (Claude Code, Codex, Claude Desktop, Cursor, Windsurf, VS Code, Gemini CLI, Zed, Cline) it adds a
`pipeshub` MCP entry and a short instruction file. It backs up every file before editing it, and running it
again changes nothing.

```bash
pipeshub init --dry-run               # print every change, write nothing
pipeshub init --yes --project         # no questions; also add the AGENTS.md / CLAUDE.md block and per-agent rule files
pipeshub init --client cursor,codex   # only these agents
pipeshub uninstall                    # remove everything init added
pipeshub dev up | down | status       # the local stack on its own
```

Install the command once with `npm i -g @pipeshub-ai/standalone` to type `pipeshub` directly.

Needs Node 20+ and Docker (Docker Desktop, or Docker Engine with the Compose plugin). The stack uses about 4 GB of memory.
The stack's files and secrets live in `~/.pipeshub/standalone` (mode 0600 for `.env`).
