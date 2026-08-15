# PipesHub for QM

Let your QM agents answer from your company's documents — Drive, Slack, Gmail,
Jira, Confluence, and your knowledge base — with each person seeing only what
they are already allowed to see in PipesHub.

## What this is

Three files that teach a QM agent to use PipesHub:

| File | Job |
| --- | --- |
| `sandbox/Dockerfile` | installs the `pipeshub` command into the agent's sandbox |
| `sandbox/tools/pipeshub/tool.json` | tells QM the command exists, and which uses need approval |
| `sandbox/skills/pipeshub/SKILL.md` | tells the agent when to reach for it and how to read its results |

This is a **deployment-layer folder** — you copy it into your QM deployment
directory and publish it. It is *not* a git skill pack. QM supports both, they
are different mechanisms, and only the deployment layer can carry a tool
descriptor and a Dockerfile. Importing it as a skill pack will not work.

The folder lives in the same repository as the `pipeshub` CLI it configures,
deliberately. The Dockerfile pins a CLI version, the approval rules in
`tool.json` name real subcommands, and `SKILL.md` documents the CLI's exit
codes — so changing the CLI means changing this folder too. Kept together, that
is one atomic change. Kept apart, they drift silently: an approval rule naming
a subcommand that no longer exists matches nothing and protects nothing.

## Before you start

Two requirements surprise almost everyone. Both come from how QM works, not
from PipesHub, and neither is something we can remove.

**Your PipesHub must be reachable from the public internet over HTTPS.** Agent
sandboxes do not run on your machine — they run on Fly Sprites or in AWS Lambda
MicroVMs. Even `target: docker` only makes QM's core and web UI local. So
`localhost`, `host.docker.internal`, and LAN addresses are unreachable from a
sandbox, and the CLI refuses to send a credential in cleartext to a public host.

**You need a sandbox backend credential.** The `sprites` backend requires a
`SPRITES_TOKEN` from Fly Sprites — a separate service from Fly, with its own
login. A Fly account by itself is not enough. Without a sandbox backend, QM
agents cannot run commands at all, so nothing here will work.

Budget for both before you start.

### Neither sandbox backend can install the CLI today

**Read this before you start.** As of QM CLI 0.1.4, there is no working path
that gets the `pipeshub` program into a sandbox automatically. Both backends
fail, for different reasons, and both are filed upstream:

| Backend | What happens |
| --- | --- |
| `sprites` | You publish a sandbox image containing the CLI. It is **silently ignored** and the stock base boots instead — [qm#272](https://github.com/yc-software/qm/issues/272) |
| `aws` | There is no mechanism to install a program into a Lambda MicroVM at all — [qm#350](https://github.com/yc-software/qm/issues/350) |

We measured the sprites case rather than inferring it: we published a 3.7 GB
image with the CLI installed at `/usr/local/bin/pipeshub`, and the sandbox came
up with a **2.4 MB** overlay and an empty `/usr/local/bin`.

**The workaround that does work** is to have the agent install the CLI on first
use. Sandboxes have Node, npm, and access to the npm registry, and a global
install persists between turns — so it happens once per person, not once per
message:

```bash
npm install -g @pipeshub-ai/mcp
```

`SKILL.md` can carry that as a first-run step. It is not how this should work,
and we are not documenting it as the supported path — but it does work, and it
is enough to evaluate the integration today.

Everything else in this guide is accurate. When either upstream issue is fixed,
the `sandbox/Dockerfile` in this bundle installs the CLI the intended way and
the workaround can be dropped.

## Setup — admin, once

1. **Scaffold the folder** into your QM deployment directory:

   ```bash
   npm install -g @pipeshub-ai/mcp
   pipeshub init-qm /path/to/your-qm-deployment
   ```

   Use this rather than copying by hand: it stamps the Dockerfile's version pin
   from the package you just installed, so the folder and the CLI it describes
   cannot end up on different versions.

   Re-running is safe. Files that already exist are kept and listed rather than
   overwritten (`--force` overrides). An existing `sandbox/Dockerfile` is
   appended to, not replaced — and left alone entirely if it already installs
   the CLI.

2. **Set your PipesHub origin** in `qm.config.jsonc`, merging in
   `qm.config.fragment.jsonc`:

   ```jsonc
   "sandbox": {
     "backend": "sprites",
     "env": { "PIPESHUB_BASE_URL": "https://pipeshub.your-company.com" }
   }
   ```

   An origin with no path — the CLI appends `/mcp` itself.

   **Check that this variable actually arrives**, before assuming it did. Run
   `pipeshub auth status` from a sandbox: if it reports `PIPESHUB_BASE_URL is
   not set`, the value is not reaching the sandbox on your QM version and you
   need the fallback below.

   On the QM build we tested against, `sandbox.env` was emitted by the CLI as
   `FLY_RESIDENT_ENV_*` on the core container but **nothing in core read those
   variables**. What a sandbox actually receives is assembled from two sources
   only: each person's keychain credentials, and org-level service credentials
   with delivery `env`.

   **Fallback if `sandbox.env` does not arrive:** add `PIPESHUB_BASE_URL` as an
   org service credential (delivery `env`, key `PIPESHUB_BASE_URL`) from the
   admin UI. It is a deployment-wide, non-secret value, so org scope is the
   right home for it — unlike the token, which must stay per-person.

3. **Set `egress`** in `sandbox/tools/pipeshub/tool.json` to your PipesHub
   hostname. It ships as `pipeshub.example.com` and **must be changed**.

4. **Publish it:**

   ```bash
   qm check && qm sandbox publish && qm up
   ```

### If you would rather copy the files by hand

Check out the tag matching the CLI version you install. Cloning the default
branch can pair a newer folder with an older binary — the exact drift `init-qm`
exists to prevent.

```bash
VERSION=$(npm view @pipeshub-ai/mcp version)
git clone --depth 1 --branch "v${VERSION}" \
  https://github.com/pipeshub-ai/mcp-server.git /tmp/ph
cp -r /tmp/ph/qm/sandbox/. /path/to/your-qm-deployment/sandbox/
cp /tmp/ph/qm/qm.config.fragment.jsonc /path/to/your-qm-deployment/
```

You then have to set `ARG PIPESHUB_CLI_VERSION` in `sandbox/Dockerfile`
yourself. `init-qm` does that for you.

## Setup — each person, once

1. In PipesHub, go to **Developer Settings → Personal Access Tokens → Create**.
2. **Deselect every scope**, then select only these five:

   ```text
   conversation:chat   semantic:write   kb:read   user:read   connector:read
   ```

   The create panel starts with everything selected, so accepting the default
   grants far more than this integration needs.
3. In QM, add the token to **your own** keychain — not a shared room:

   ```text
   service: pipeshub
   kind:    env
   value:   the token value only — no URL, no "PIPESHUB_TOKEN=" prefix
   ```

   The service name matters: QM derives the variable name from it, so
   `pipeshub` is what produces `$PIPESHUB_TOKEN`.

It reaches your sandbox as `$PIPESHUB_TOKEN` on your next turn — personal
keychain credentials materialize on their own, with no grant step. Run
`pipeshub auth connect-help` to print these steps at any time.

## Security

The decisions worth understanding before you roll this out:

- **One token per person. Never a shared org token.** PipesHub filters results
  by the identity in the token. Share one and everybody reads everything the
  token's owner can — which removes the property that makes this safe.
- **Never put a token in `sandbox.secretEnv`.** That is delivered to every
  sandbox in the deployment, handing one person's credential to the whole
  organization.
- **Never paste a token into a chat.** Transcripts are durable and pass through
  the model provider. The CLI deliberately has no command that accepts a
  credential as an argument, so there is no supported way to do this.
- **Use a short expiry**, and revoke from Developer Settings when someone
  leaves.
- **Treat retrieved text as untrusted.** The CLI delimits it and the skill tells
  the agent not to obey instructions found inside it. PipesHub indexes Slack and
  email — surfaces anyone can write to.
- **Shared rooms are not supported in v1.** A personal keychain credential does
  not materialize in a shared scope. That is QM's behaviour, not something this
  folder adds.

[`SECURITY.md`](SECURITY.md) has the full reasoning, the threat model, and an
explicit list of what has and has not been verified.

## Exit codes

`SKILL.md` teaches the agent to branch on these:

| Code | Meaning |
| --- | --- |
| `0` | success |
| `1` | an error that is none of the below — usually the network |
| `2` | usage or configuration problem |
| `3` | not authenticated |
| `4` | forbidden — this person cannot see it |
| `5` | rate limited |
| `6` | no results, **or an `ask` answer with no sources** |

Exit `6` on an uncited `ask` means no sources, so nothing in it can be
verified. Relay a refusal. If it asserts facts, do not repeat them — say it
came back unsourced. Ignore `confidence` — it takes every value on both
sides.

[`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) lists every failure message with its
cause. Start there when someone says "it says I'm not connected" — usually a
keychain entry under the wrong service name.

## Air-gapped and locked-down networks

`sandbox/Dockerfile` installs the CLI from the public npm registry at build
time. If your network blocks that, you can point it at an internal registry
mirror or vendor the tarball into the image. All that matters is that a working
`pipeshub` ends up on `PATH` in the sandbox image.

If you rewrite that install step, **keep the smoke check on the end of it**:

```dockerfile
RUN npm install -g "@pipeshub-ai/mcp@${PIPESHUB_CLI_VERSION}" \
 && pipeshub --help >/dev/null
```

That second line is what fails the image build when the binary did not land.
`qm check` will not catch it for you — it accepts the presence of a Dockerfile
as evidence the binary will be installed and never verifies it
(`sandbox-layer.js:754`). Without the smoke check, a broken install surfaces as
an agent that cannot run the tool at turn time.
