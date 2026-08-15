# PipesHub for QM

Let your QM agents answer from your company's documents — Drive, Slack, Gmail,
Jira, Confluence, and your knowledge base — with each person seeing only what
they are already allowed to see in PipesHub.

**Start here:** [`docs/use-with-qm.md`](docs/use-with-qm.md) is the short
operator guide. This file is the bundle reference.

## What this is

Three files that teach a QM agent to use PipesHub:

| File | Job |
| --- | --- |
| `sandbox/Dockerfile` | installs the `pipeshub` command into the agent's sandbox |
| `sandbox/tools/pipeshub/tool.json` | tells QM the command exists, and which uses need approval |
| `sandbox/skills/pipeshub/SKILL.md` | tells the agent when to reach for it and how to read its results |

This is a **deployment-layer folder** — you copy it into your QM deployment
directory and `qm up`. It is *not* a git skill pack. QM supports both, they
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

**Until those are fixed, first-run install is the path.** Sandboxes have Node,
npm, and access to the npm registry, and a global install persists between
turns — once per Sprite, not once per message. `SKILL.md` carries:

```bash
command -v pipeshub >/dev/null 2>&1 || npm install -g @pipeshub-ai/mcp
```

Use `command -v`, not `pipeshub --version` — a missing binary would otherwise
print `command not found` to stderr before the install that fixes it.

The first-run install is **unpinned on purpose**. `sandbox/Dockerfile` pins an
exact version because an image that actually booted should not silently
change agent behaviour on a remote release. That image does not boot today
([qm#272](https://github.com/yc-software/qm/issues/272)), so the unpinned
line is the only install that runs. Leaving it unpinned means a Sprite picks
up CLI patches without a skill edit. When the upstream issue is fixed, the
Dockerfile is the install path and this first-run step can be dropped.

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

2. **Deliver the PipesHub origin** as an environment variable that actually
   reaches the sandbox. An origin with no path — the CLI appends `/mcp`
   itself.

   `sandbox.env` looks like the right home and **does not arrive**. QM writes
   it onto the core container as `FLY_RESIDENT_ENV_*`; nothing reads those
   variables back ([qm#351](https://github.com/yc-software/qm/issues/351)).
   What a sandbox receives is each person's keychain, plus org service
   credentials with delivery `env`.

   Put `PIPESHUB_BASE_URL` in a personal keychain entry (service `pipeshub`,
   environment variable `PIPESHUB_BASE_URL`) or, for a whole team, as an org
   service credential (delivery `env`, key `PIPESHUB_BASE_URL`). Confirm with
   `pipeshub auth status` from a sandbox before debugging anything else.

3. **Set `egress`** in `sandbox/tools/pipeshub/tool.json` to your PipesHub
   hostname. It ships as `pipeshub.example.com` and **must be changed**.

4. **Bring it up:**

   ```bash
   qm check && qm up
   ```

   `qm sandbox publish` is optional and, on Sprites, does not install the CLI
   ([qm#272](https://github.com/yc-software/qm/issues/272)).

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
   Accept the defaults.
2. In QM, add **two** credentials to **your own** keychain — not a shared room:

   ```text
   service: pipeshub
   environment variable: PIPESHUB_TOKEN
   value: the token only — no URL, no "PIPESHUB_TOKEN=" prefix

   service: pipeshub
   environment variable: PIPESHUB_BASE_URL
   value: public HTTPS origin, no /mcp path
   ```

   Service must be exactly `pipeshub`. Fill in the environment-variable field
   on both entries. If you leave it blank on the token, QM derives
   `PIPESHUB_TOKEN` from the service name; it will not derive the URL.

They reach your sandbox on the next turn — personal keychain credentials
materialize on their own, with no grant step. Run `pipeshub auth connect-help`
to print these steps at any time.

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
| `6` | nothing retrieved, **or an `ask` answer with no citations** |

Exit `6` on an uncited `ask` means nothing was retrieved. The usual case is
the corpus cannot support the question — PipesHub says it could not find the
information, with zero citations. That is a correct negative, not a
fabrication. The exit code stops the agent treating a successful-looking call
as a retrieved fact.

Citations are the retrieval signal. Confidence is how sure the model is of its
reply, including being sure of an absence; do not read Very High as "found in
a document."

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
