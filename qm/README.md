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

1. Copy this directory's `sandbox/` into your QM deployment directory, merging
   with any `sandbox/` you already have:

   ```bash
   git clone --depth 1 https://github.com/pipeshub-ai/mcp-server.git /tmp/ph
   cp -r /tmp/ph/qm/sandbox/. /path/to/your-qm-deployment/sandbox/
   ```
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
