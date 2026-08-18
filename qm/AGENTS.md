# AGENTS.md — QM bundle

Operators copy this folder via `pipeshub init-qm`. `init-qm` writes `sandbox/tools/pipeshub`, `sandbox/skills/pipeshub`, and (only on backends that can boot a custom image) a Dockerfile. It does **not** copy this file.

## What is allowed to change together

The Dockerfile pin, `tool.json` approval `command`s, CLI subcommands, and `SKILL.md` exit-code table are one contract. Changing the CLI without this folder (or the reverse) is a silent break: an approval rule naming a subcommand that no longer exists matches nothing.

## Rules

- Bind `tool.json` to `@yc-software/qm/contract`. Do not invent field names. `advertise` is a string; approvals use `decision`: `"require_approval"` or `"deny"`. There is no `"approve"`.
- Approval `command` **excludes** the binary — QM prepends it.
- Never put a PAT in `sandbox.secretEnv` or `sandbox.env`. Personal keychain, service name exactly `pipeshub` → `PIPESHUB_TOKEN`.
- Sprites/AWS MicroVM: do not write `sandbox/Dockerfile` (`init-qm` already skips it). The skill installs `@pipeshub-ai/mcp` on first use.
- Agent-facing copy: `sandbox/skills/pipeshub/SKILL.md`. Operator copy: `SECURITY.md`, `TROUBLESHOOTING.md`, `docs/use-with-qm.md`. Exit `6` on `ask` means no citation objects: relay the answer as unsourced and not confirmed; do not restate its claims as fact. `confidence` is a self-score, not a citation proxy — do not treat it as one, and do not discard the answer because of it.
