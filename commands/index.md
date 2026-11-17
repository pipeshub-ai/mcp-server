---
description: Index this repository into PipesHub so its code can be searched and cited
argument-hint: "[path]"
---

Index the git repository in the current working directory (or the path in "$ARGUMENTS", if one is given) into PipesHub. Never ask the user to paste a token into chat, and never print one.

1. Indexing sends the repository's files (tracked and untracked, `.gitignore` respected, likely secrets such as `.env` and keys never sent) to the PipesHub the CLI uses. If `PIPESHUB_BASE_URL` or `PIPESHUB_MCP_URL` names a host that is not this computer, ask the user before you go on.
2. From the repository, run this with a 10-minute timeout. It prints progress while it uploads and waits for indexing:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/pipeshub-local.mjs" index $ARGUMENTS
   ```

3. Exit 0: report the files sent, the final state, and whether the code tools are listed. If they are not, the user restarts Claude Code (or reconnects the server in `/mcp`).
4. Any other exit: relay the error as printed, with the next step it names. The usual ones: the local runtime is not installed (it prints the install command), PipesHub is not running (`pipeshub dev up`), or the CLI is not signed in (`/pipeshub:setup`). Do not retry in a loop.

To keep the index current while they work, the user can run `pipeshub index --watch` in a terminal.
