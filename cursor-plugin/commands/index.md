---
name: index
description: Index this repository into PipesHub so its code can be searched and cited
---

Index the git repository open in this workspace into PipesHub. Never ask the user to paste a token into chat, and never print one.

1. Indexing sends the repository's files (tracked and untracked, `.gitignore` respected, likely secrets such as `.env` and keys never sent) to the PipesHub the CLI is signed in to (`auth status` on the command from step 2 prints it as `baseUrl`). If that is not on this computer, ask the user before you go on.
2. From the repository root, run `pipeshub index`, or `npx -y @pipeshub-ai/standalone index` when `pipeshub --help` does not list `index [path]`, with `PIPESHUB_BASE_URL` set to the `baseUrl` from step 1 in its environment, so the files go only to the origin you checked. It prints progress while it uploads and waits for indexing, which can take several minutes.
3. If neither command exists (npm reports the package as not found, or the CLI says `unknown command: index`), the local runtime is not available from npm yet. Tell the user that, and that they can self-host PipesHub with https://docs.pipeshub.com/for-agents-local-demo.md and sign in with the `setup` command. Stop there.
4. Otherwise relay the result: the files sent and the final state, or the error with the next step it names (for example `pipeshub dev up` when PipesHub is not running). Do not retry in a loop.
