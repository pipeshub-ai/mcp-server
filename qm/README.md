# PipesHub for QM

Give your QM agents grounded, permission-correct answers from your company's
Drive, Slack, Gmail, Jira, Confluence, and knowledge base.

This is a **deployment-layer folder**, installed with `qm up` — *not* a git
skill pack. QM supports both and they are different mechanisms; this bundle
ships a tool descriptor and a Dockerfile, which a skill pack does not carry.
Don't try to import it the other way.

It lives in the same repository as the `pipeshub` CLI it configures, and that
is deliberate. The Dockerfile pins a CLI version, `tool.json`'s approval rules
name real subcommands, and `SKILL.md` teaches the CLI's exit codes — so a change
to the CLI's surface requires a matching change here. Keeping them together
makes that one atomic change instead of two repositories that can drift, where
the drift is silent: an approval rule naming a subcommand that no longer exists
matches nothing and protects nothing.

## Install

**Admin, once:**

1. Scaffold the bundle into your QM deployment directory:

   ```bash
   npm install -g @pipeshub-ai/mcp
   pipeshub init-qm /path/to/your-qm-deployment
   ```

   This is preferred over copying by hand, because it stamps the Dockerfile's
   version pin from the package you just installed — so the bundle and the CLI
   it describes cannot be different versions.

   It is safe to re-run. Existing files are kept and reported rather than
   overwritten (`--force` overrides), and an existing `sandbox/Dockerfile` is
   appended to rather than replaced — or left entirely alone if it already
   installs the CLI.

   If you would rather copy the files yourself, check out the tag matching the
   CLI version you install — cloning the default branch can pair a newer bundle
   with an older binary, which is exactly the drift `init-qm` exists to prevent
   — and take the config fragment from the same checkout:

   ```bash
   VERSION=$(npm view @pipeshub-ai/mcp version)
   git clone --depth 1 --branch "v${VERSION}" \
     https://github.com/pipeshub-ai/mcp-server.git /tmp/ph
   cp -r /tmp/ph/qm/sandbox/. /path/to/your-qm-deployment/sandbox/
   cp /tmp/ph/qm/qm.config.fragment.jsonc /path/to/your-qm-deployment/
   ```

   You must then pin `ARG PIPESHUB_CLI_VERSION` in `sandbox/Dockerfile`
   yourself; `init-qm` stamps it for you.
2. Merge `qm.config.fragment.jsonc` into your `qm.config.jsonc` and set
   `PIPESHUB_BASE_URL` to your instance's origin.
3. Set `egress` in `sandbox/tools/pipeshub/tool.json` to your PipesHub
   hostname — it ships as `pipeshub.example.com` and **must be changed**.
4. `qm check && qm sandbox publish && qm up`

**Each person, once:**

1. In PipesHub: Developer Settings → Personal Access Tokens → Create.
   Deselect every scope, then select only:
   `conversation:chat` `semantic:write` `kb:read` `user:read` `connector:read`
2. In QM, add it to **your own** keychain (not a shared room):
   `service: pipeshub`, `kind: env`, value = the token only, no URL.

It arrives as `$PIPESHUB_TOKEN` in your sandbox on the next turn. Running
`pipeshub auth connect-help` prints these steps at any time.

## Before you start: what this actually requires

Two things routinely surprise people, and both are QM's shape rather than
PipesHub's:

- **Agent sandboxes do not run on the operator's machine.** They run on Fly
  Sprites or AWS Lambda MicroVMs. Even `target: docker` only makes core and
  web-ui local. So your PipesHub must be reachable from the public internet
  over HTTPS — `localhost`, `host.docker.internal`, and LAN addresses will not
  work from a sandbox, and the CLI refuses to send credentials in cleartext to
  a public host.
- **The `sprites` backend needs a `SPRITES_TOKEN`**, which comes from Fly
  Sprites — a separate service from Fly itself, with its own credentials. A Fly
  account alone is not sufficient.

## Further reading

- [`SECURITY.md`](SECURITY.md) — scope rationale, threat model, and an explicit
  list of what has and has not been verified.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — every failure message, with the
  cause. Start here when someone says "it says I'm not connected".

## Security

- **One token per person. Never a shared org token.** A shared token destroys
  PipesHub's permission filtering: everyone would read everything.
- **Never put the token in `sandbox.secretEnv`.** That is org-wide.
- **Never paste a token into a chat.** Transcripts are durable and pass through
  the model provider. The CLI has no command that accepts a credential as an
  argument, by design.
- Short expiry (30 or 90 days), and revoke from Developer Settings.
- Retrieved text is treated as untrusted data — delimited in output, and the
  skill tells the agent not to follow instructions found inside it. PipesHub
  indexes Slack and email, which anyone can write to.
- Shared rooms are not supported in v1. A personal keychain credential does not
  materialize in a shared scope, which is QM's default rather than something
  this bundle adds.

## Exit codes

The skill teaches the agent to read these:

| Code | Meaning |
| --- | --- |
| `0` | success |
| `3` | not authenticated |
| `4` | forbidden — this person cannot see it |
| `5` | rate limited |
| `6` | nothing retrieved, **or an `ask` answer with no citations** |

Exit `6` on an uncited answer is the one worth understanding. A fluent,
confident-sounding answer with no sources is more dangerous than an empty
result, because the fabrication has already happened upstream. The server's own
confidence score does not track groundedness — an answer the corpus could not
support has been observed returning "Very High" with zero citations — so the
citation count is what the rule keys off.

## Air-gapped and locked-down networks

`sandbox/Dockerfile` installs the CLI from the public npm registry at build
time. If that is blocked, pin an internal mirror, or install the published
single-file binary from GitHub Releases, or vendor the tarball. The `pipeshub`
binary just has to be on `PATH` in the sandbox image — `qm sandbox build` fails
the build if it is not.
