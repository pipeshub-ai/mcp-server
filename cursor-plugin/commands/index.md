---
name: index
description: Index this repository into PipesHub so its code can be searched and cited
---

Index the git repository open in this workspace into PipesHub. Never ask the user to paste a token into chat, and never print one.

1. Indexing sends the repository's files (tracked and untracked, `.gitignore` respected, likely secrets such as `.env` and keys never sent) to the PipesHub the CLI is signed in to. If that is not on this computer, ask the user before you go on.
2. From the repository root, run `pipeshub index`, or `npx -y @pipeshub-ai/standalone index` when `pipeshub --help` does not list `index [path]`. It prints progress while it uploads and waits for indexing, which can take several minutes.
3. If neither command exists (npm reports the package as not found, or the CLI says `unknown command: index`), the local runtime is not installed. Tell the user to run `npx @pipeshub-ai/standalone init --local` (needs Docker and Node 20 or later), which starts PipesHub on this computer, signs in, and indexes this repository. Stop there.
4. Otherwise relay the result: the files sent and the final state, or the error with the next step it names (for example `pipeshub dev up` when PipesHub is not running). Do not retry in a loop.
