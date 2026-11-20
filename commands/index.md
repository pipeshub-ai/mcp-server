---
description: Index this repository into PipesHub so its code can be searched and cited
argument-hint: "[path]"
---

Index the git repository in the current working directory (or the path in "$ARGUMENTS", if one is given) into PipesHub. Never ask the user to paste a token into chat, and never print one.

1. Indexing sends the repository's files (tracked and untracked, `.gitignore` respected, likely secrets such as `.env` and keys never sent) to the PipesHub the CLI uses: the environment's `PIPESHUB_BASE_URL` (or `PIPESHUB_MCP_URL`), or else the origin `pipeshub login` stored, which can be PipesHub Cloud. Find it with `node "${CLAUDE_PLUGIN_ROOT}/scripts/pipeshub-local.mjs" status`, which prints `baseUrl` (never a token; do not open the credentials file). If its host is not `localhost`, `127.0.0.1` or `::1`, ask the user before you go on. If it fails, go to step 4.
2. From the repository, run this with a 10-minute timeout, with the `baseUrl` from step 1 in place of `<baseUrl>`. Setting it pins the upload to the origin you checked: a sign-in that changed since step 1 is not used for another origin. It prints progress while it uploads and waits for indexing:

   ```bash
   PIPESHUB_BASE_URL='<baseUrl>' node "${CLAUDE_PLUGIN_ROOT}/scripts/pipeshub-local.mjs" index
   ```

   If a path was given, append it as one more argument in single quotes, writing each `'` in it as `'\''`, so the shell neither splits nor expands it.

3. Exit 0: report the files sent, the final state, and whether the code tools are listed. If they are not, the user restarts Claude Code (or reconnects the server in `/mcp`).
4. Any other exit: relay the error as printed, with the next step it names. The usual ones: the local runtime is not installed (it names the self-hosting guide), PipesHub is not running (`pipeshub dev up`), or the CLI is not signed in (`/pipeshub:setup`). Do not retry in a loop.

To keep the index current while they work, the user can run `pipeshub index --watch` in a terminal, or `npx -y @pipeshub-ai/standalone index --watch` when step 2 ran through npx (their `pipeshub` has no `index` command, or there is none).
