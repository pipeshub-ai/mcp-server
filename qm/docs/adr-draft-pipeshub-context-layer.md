# DRAFT — not for filing yet

Intended for `yc-software/qm/adrs/`. QM's contribution model is plain-English
descriptions of changes rather than pull requests of code, so this is prose.

**Hold this until there is a working end-to-end demo.** The plan's own review
concluded the ADR should follow a working demo rather than precede it, and at
time of writing the sandbox gates are unfinished: `SPRITES_TOKEN` was not
obtainable, so no agent turn has actually run against PipesHub. Filing a
proposal that describes behaviour nobody has observed end-to-end would be
exactly the kind of plausible-but-unverified claim this project has been
careful to avoid. Everything below is verified except where explicitly marked.

---

## PipesHub as a context layer for QM

### What this proposes

Nothing in QM core. This describes an integration that already works within
QM's existing extension model, and asks for two small considerations that would
make this class of integration easier for everyone.

PipesHub is a permission-aware retrieval layer over an organization's Drive,
Slack, Gmail, Jira, Confluence, and knowledge base. An operator can point QM at
their PipesHub instance and have agents answer from company documents, with each
person's answers bounded by their own permissions.

### How it works today

Entirely through the deployment layer, with no core changes:

- A `pipeshub` binary in the sandbox image, installed from npm by
  `sandbox/Dockerfile`.
- `sandbox/tools/pipeshub/tool.json` — a descriptor with `auth.check`,
  `auth.reauth`, hints, and approval rules.
- `sandbox/skills/pipeshub/SKILL.md` — when to reach for it.
- Each person's credential in their own keychain as `service: pipeshub`,
  `kind: env`, arriving as `$PIPESHUB_TOKEN`.

The per-person keychain path is the part that makes this safe, and it works
without any ceremony: in a person's own scope their own credentials materialize
every turn, with no grant needed. A shared room gets nothing, which is the
correct default and required no work on our side.

### What we found while building it

Offered as feedback from an integrator's first contact with the deployment
layer. All verified against `@yc-software/qm@0.1.4`.

**The docker target's sandbox story is easy to misread.** `deployment.md` says
the docker target "runs everything on the local machine". It runs core and
web-ui locally, but sandbox hosting is chosen without consulting `target` at
all, and the only backends the CLI accepts are `sprites` and `aws`. Omitting
`sandbox.app` does not fall back to something local — it disables `execute`
entirely. An integrator reasonably reads "docker target" as "no cloud account
needed" and discovers otherwise several steps in.

The core image does implement a `local` backend — its own startup error names
`sprites, aws, or local` — but the CLI rejects that value, and forcing it
through `env.core` does not help, because the local backend shells out to a
`docker` binary that the core container does not have. If `local` is intended
for QM's own development rather than for operators, saying so in
`deployment.md` would save the next person the same investigation.

**`SPRITES_TOKEN` is a second, non-obvious credential.** `sprites` requires a
token for `api.sprites.dev`, which is a different service from Fly with its own
identity system: Fly org tokens and app-scoped deploy tokens are both rejected,
and there is no public `sprite` CLI. Meanwhile the Fly app that `sandbox.app`
requires — and that `qm sandbox publish` pushes an image to — is not referenced
anywhere in core's sprites path that we could find. An operator therefore
creates a Fly app, mints a Fly token, and then discovers a third credential is
needed before an agent can run one command. Stating the full credential list up
front in `deployment.md` would set expectations correctly.

**Approval-rule semantics are worth documenting by example.** `command`
excludes the binary — `compileApproval` prepends it — and the compiled pattern
is prefix-style and `\b`-anchored rather than `^`-anchored. Both are sensible;
neither is guessable from the type definition, and getting it wrong yields a
rule that silently matches nothing. One worked example in the contract docs
would prevent a class of security rules that appear to work and do not.

### Two requests

1. **Document the sandbox-hosting prerequisites in `deployment.md`**, including
   that the docker target still needs Fly Sprites or AWS, and the full list of
   credentials each backend requires.
2. **A worked `tool.json` example with an approval rule**, showing that
   `command` excludes the binary and what the compiled pattern matches.

Neither requires a code change. Both would have saved us a day.

### What we are not asking for

We are **not** asking QM to add an MCP client. QM's MCP usage runs the other
way — `createSdkMcpServer` exposing QM's own tools to its harness, with
`strictMcpConfig: true` — and that is a reasonable design. Our CLI reaches
PipesHub's MCP endpoint itself, which keeps the integration entirely inside the
deployment layer where it belongs.

### Status

The CLI and bundle are built and validated: `validateSandboxLayer` passes with
no errors or warnings, and the approval rules were compiled with QM's own
`compileApproval` to confirm they match what was intended. Permission
enforcement, citation handling, and the credential path have been verified
against a live PipesHub instance.

**Not yet verified end-to-end through a QM sandbox**, for the credential reason
above. This document should not be filed until that gap is closed.
