# Troubleshooting

Every message below is the CLI's real output, captured from a running
deployment. If you see something not listed here, the exit code narrows it:
`2` configuration, `3` not authenticated, `4` forbidden, `5` rate limited,
`6` nothing retrieved.

## "No PipesHub credential found"

```
pipeshub: No PipesHub credential found ($PIPESHUB_TOKEN is unset).
Run 'pipeshub auth connect-help' for setup steps.
```

**This is the one nearly everybody hits first.** Your token is not in your QM
keychain, or it is there under the wrong service name.

QM derives the variable from the service name: service `pipeshub` produces
`PIPESHUB_TOKEN`. If you named the entry something else, the CLI will not see
it. Check that the entry is:

```
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

```
pipeshub: PIPESHUB_BASE_URL is not set — an admin sets it once for the
deployment. Run 'pipeshub auth connect-help' for the steps.
```

Admin-level, not yours. It goes in `qm.config.jsonc` under `sandbox.env`,
followed by `qm up`. If the message *also* says your credential is missing, both
need doing.

## "refusing to send credentials in cleartext to a public host"

```
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

```
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

An uncited answer means the model produced prose the documents do not support.
It can read fluently and the server may report high confidence for it — an
answer to a question the corpus could not support has been observed returning
`confidence: "Very High"` with zero citations. Do not treat it as fact. The
answer text is still in the output so a human can read it; `cited: false` and
the `warning` field say why it should not be trusted.

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

## The agent ignores the tool, or uses the wrong one

Check the skill reached the sandbox: `qm check` should list `pipeshub` under
both `tools` and `skills`. If the tool is listed but the agent never reaches for
it, the skill's `description` frontmatter is what QM matches against — that is
the text to adjust, not the hints.
