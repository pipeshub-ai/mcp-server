# Troubleshooting

Every message below is the CLI's real output, captured from a running
deployment. If you see something not listed here, the exit code narrows it:

| Code | Meaning |
| --- | --- |
| `1` | an error that is none of the below — a network failure, or an unexpected server response |
| `2` | configuration or usage |
| `3` | not authenticated |
| `4` | forbidden — this person cannot see it |
| `5` | rate limited |
| `6` | nothing retrieved, **or an `ask` answer with no citations** |

## "No PipesHub credential found"

```text
pipeshub: No PipesHub credential found ($PIPESHUB_TOKEN is unset).
Run 'pipeshub auth connect-help' for setup steps.
```

**This is the one nearly everybody hits first.** Your token is not in your QM
keychain, or it is there under the wrong service name.

QM derives the variable from the service name: service `pipeshub` produces
`PIPESHUB_TOKEN`. If you named the entry something else, the CLI will not see
it. Check that the entry is:

```text
service: pipeshub      (exactly this — it determines the variable name)
kind:    env
value:   the token only — no URL, no "PIPESHUB_TOKEN=" prefix
```

Two specific traps:

- **Our own PAT create panel gives you a two-line paste block** containing
  `PIPESHUB_MCP_URL=…` and `PIPESHUB_MCP_TOKEN=…`. That block is for a local MCP
  client, not for the QM keychain. A keychain `env` credential is **one secret
  value** with no variable name and no URL. Paste the token value only. (The CLI
  does accept `PIPESHUB_MCP_TOKEN` if it genuinely reaches the environment, so
  you are not broken either way — but the keychain entry must still be a bare
  value.)
- **A personal credential does not appear in a shared room.** Only explicitly
  granted standing credentials do. If you are in a channel rather than your own
  scope, this is expected: v1 supports personal scopes only.

## "PIPESHUB_BASE_URL is not set"

```text
pipeshub: PIPESHUB_BASE_URL is not set — it must reach the sandbox as an env var
(keychain or org service credential, not sandbox.env). Run 'pipeshub auth
connect-help' for the steps.
```

If the message *also* says your credential is missing, both need doing.

`sandbox.env` does not reach the sandbox
([qm#351](https://github.com/yc-software/qm/issues/351)). Deliver the origin
as:

- a personal keychain entry: service `pipeshub`, environment variable
  `PIPESHUB_BASE_URL`, or
- an org service credential: delivery `env`, key `PIPESHUB_BASE_URL`

The URL is not a secret. Org scope is the right home for a whole team; a
personal keychain entry is enough to confirm the path. Your token stays
personal either way.

## "refusing to send credentials in cleartext to a public host"

```text
pipeshub: refusing to send credentials in cleartext to a public host:
http://pipeshub.example.com
Use https://, or pass --insecure-http if this really is a private address
that the built-in rules do not cover.
```

`PIPESHUB_BASE_URL` uses `http://` against a public DNS name. Use `https://`.

Cleartext *is* allowed for loopback, RFC1918 and link-local addresses,
single-label hostnames like `http://pipeshub-ai`, and `.local` / `.internal` /
`.svc` / `host.docker.internal`. Note none of those are reachable **from a QM
sandbox**, which does not run on the operator's machine — so in a sandbox this
message means you need a real public HTTPS address, not an override.

## "could not reach …"

```text
pipeshub: could not reach http://…/mcp: fetch failed
```

Network, not auth. From inside a sandbox the usual cause is pointing at
something local: `localhost` is the sandbox itself, and `host.docker.internal`
or a LAN address belongs to a machine the sandbox cannot see. A self-hosted
PipesHub needs a publicly reachable address.

## `auth status` says `connected: false`

The command still exits with a code that tells you which problem it is:

- **exit 3** — the instance rejected the token. Expired, revoked, or minted
  against a different instance. `expiresAt` and `expired` in the output are read
  from the token itself, so check those first.
- **exit 1 / `could not reach`** — the address is wrong or unreachable.

`auth status` never prints the token, in any mode. If you need to compare one,
compare a six-character prefix.

## Exit 4 — forbidden

The person you are acting for genuinely cannot access that record. This is the
integration working: PipesHub filters by the token's identity, and a denial is a
`403`, not an empty result. Do not retry through a different command — `search`,
`ask`, and `get` all enforce the same permissions.

## Exit 6 — nothing retrieved

Two different situations share this code:

- **`search` returned no hits.** Rare in practice: semantic search returns
  nearest neighbours, so an unrelated query still produces low-scoring matches.
- **`ask` returned an answer with no citations.** Common, and the important one.

No citations means nothing was retrieved. Often the answer text already says
the information could not be found — that is the correct response, and
`confidence: "Very High"` on it is certainty of absence. Relay that; do not
invent a source. The answer text is still in the output; `cited: false` and
the `warning` field mark it as not a retrieved fact.

## `pipeshub sources` shows `llmModels: []`

Expected. That field needs `config:read`, which the recommended agent scope set
deliberately omits. It is empty rather than a `403`, so it is impossible to tell
from the response alone whether no models are configured or you simply cannot
see them — the CLI reports `llmModelsVisible: false` to make the ambiguity
explicit. Nothing else is affected: `ask` uses the org's default model without
being told which.

## "auth set does not exist, deliberately"

There is no command that accepts a credential as an argument, and there will not
be one. Anything on a command line lands in shell history, process listings, and
potentially a chat transcript. Use the keychain.

## The agent says `pipeshub: command not found`

The tool is configured correctly and the program simply is not in the sandbox.
`qm check` passes, `qm sandbox publish` succeeds, and the binary still is not
there — see the README section "Neither sandbox backend can install the CLI
today", which covers both upstream causes and the first-use install workaround.

To confirm it is this and not something else, have the agent run:

```text
command -v pipeshub || echo "pipeshub: absent"; df -h / | tail -1
```

`command -v` searches the whole `PATH`, so it settles the question directly —
unlike listing one directory, which misses the binary if it landed elsewhere and
truncates if the directory is large.

The `df` line tells you *why*. An overlay of a few megabytes against a
multi-gigabyte published image means the sandbox booted the stock base rather
than yours, which is the `sprites` case in the README.

## The agent ignores the tool, or uses the wrong one

Check the skill reached the sandbox: `qm check` should list `pipeshub` under
both `tools` and `skills`. If the tool is listed but the agent never reaches for
it, the skill's `description` frontmatter is what QM matches against — that is
the text to adjust, not the hints.

## `qm doctor` passes, the stack is up, but no command ever runs

This one is worth knowing before you debug PipesHub, because nothing about it
points at PipesHub.

**`qm doctor` passing is not evidence that agents can execute anything.** With
`target: docker`, `doctor`'s sandbox step only runs `fly status -a <your
sandbox app>` — it checks the Fly app exists and your account can see it, and
nothing else (`backends/doctor.js:125-133`). It never verifies a sandbox
backend can actually start a machine.

Meanwhile the backend selection can silently land on `local`:

- The `qm` CLI only emits `SANDBOX_BACKEND` when you set `sandbox.backend`
  explicitly, or when `target` is `fly` (`config.js:100`).
- With `SANDBOX_BACKEND` unset, the core defaults to **`local`**
  (core `config.ts:475`).
- `local` starts sandboxes by shelling out to a `docker` binary
  (`sandbox/docker-exec.ts:8`), and the core **container** has neither a Docker
  socket nor a `docker` CLI. `local` exists for running core outside a
  container during QM's own development.

So the stack boots, `doctor` is green, and `execute` fails at turn time.

Set `sandbox.backend` explicitly and supply that backend's credential.

**But note that neither backend installs the CLI for you today** — `sprites`
ignores your published image ([qm#272](https://github.com/yc-software/qm/issues/272))
and `aws` has no install mechanism at all
([qm#350](https://github.com/yc-software/qm/issues/350)). See the README section
"Neither sandbox backend can install the CLI today" for the first-use install
that does work. Rebuilding and publishing the sandbox image does **not**
currently put `pipeshub` on PATH.

`sprites` needs `SPRITES_TOKEN`, which comes
from Fly Sprites — a separate service from Fly, with its own identity
(`secrets.js:88`, core `sandbox/sprites-sandbox.ts:79`). Note that the `SPRITES_TOKEN` requirement
is itself conditional on `SANDBOX_BACKEND=sprites`, which is why leaving the
backend unset gets you past every check and still leaves you with an agent that
cannot run `pipeshub`.
