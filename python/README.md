# pipeshub

Run PipesHub on your own computer and connect it to your coding agents, without installing Node.

```bash
uvx pipeshub init          # or: pipx install pipeshub && pipeshub init
```

`init` starts PipesHub in Docker, creates your first account, signs in on this computer, adds PipesHub to the coding agents it finds (Claude Code, Codex, Cursor, Windsurf, Gemini CLI, Zed, Cline and others), and indexes the current folder. `pipeshub init --uninstall` removes exactly what it wrote. Run `pipeshub` with no arguments for every command.

This package is the same program as `npx @pipeshub-ai/standalone`, compiled to one file per platform and shipped inside the wheel. The Python part only finds that file and runs it; it has no dependencies. The version matches the npm package.

Needs Docker. Wheels exist for Linux (glibc and musl, x86_64 and arm64), macOS (arm64, x86_64) and Windows (x86_64).

No Node anywhere: the entry `init` writes for each agent runs `uvx --from pipeshub>=0.1.0 pipeshub start` (when you ran `uvx pipeshub init`) or `pipeshub start` / the full path to the `pipeshub` script (pip, pipx, `uv tool`). `start` is the same MCP bridge as `npx @pipeshub-ai/mcp start`.

## Build (maintainers)

```bash
bun install
python3 python/build_wheels.py            # all targets into python/dist/ (or name targets, e.g. linux-x64)
python3 -m unittest discover -s python/tests
```
