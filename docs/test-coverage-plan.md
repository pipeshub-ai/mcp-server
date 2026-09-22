# Test coverage plan — @pipeshub-ai/mcp

The goal this serves: release this package without manual testing, and know it
still works against a real PipesHub. This file says what is covered, what is
not, and in what order the gaps get closed. Update the status lines as they
land; a plan nobody amends stops being read.

## Where the risk actually is

The repository is three layers with very different risk profiles, and treating
them as one number hides that. At the time of writing `bun test --coverage`
reports 60.75% lines overall, which reads far healthier than it is.

| Layer | What it is | Lines | Who should test it |
| --- | --- | --- | --- |
| `src/models/`, `src/funcs/`, `src/lib/` | Speakeasy-generated from the OpenAPI spec | 5–20% | Nobody, by hand. It is regenerated; hand-written tests over it rot on the next generation. What it needs is a drift check against the spec — §2 |
| `src/mcp-server/tools/`, `src/mcp-server/tools.ts` | Hand-written. Each tool wraps several API calls and shapes one response for an LLM | 12–80% | Unit tests over the shaping and the error paths — §3 |
| `src/cli/` | The `pipeshub` binary and its documented contract | 13–23% → see §4 | Unit tests over the contract, plus a live run — §1, §4 |

The generated layer dominates the line count, which is why the headline number
flatters. Every number below is the hand-written half.

## 1. Live end-to-end against a running PipesHub — **not started, needs a decision**

**The gap.** Nothing in this repository has ever talked to a PipesHub. Every
test here is pure. This package is a *client* for a real `/mcp` endpoint, so the
seam that matters most — this code against that server — is the one seam with
no coverage at all. A release today rests on someone trying it by hand.

**Why it is first.** The other gaps cost a bug. This one costs the confidence
the whole exercise is for.

**What exists to build on.** The platform repository already stands a full
stack up and mints MCP tokens for its own tests:
`integration-tests/helper/mcp_oauth.py`, `mcp_pin.py`, `mcp_client.py`, and the
suite at `integration-tests/response-validation/mcp/`. That suite covers the
*server* side — handshake, the tool surface against a golden file, auth — but
never calls a tool and never involves this package.

**What to build.** A suite that points a built `@pipeshub-ai/mcp` at that stack
and drives it: `pipeshub whoami`, a search that returns a known seeded record, a
`ask` that returns citations, the documented exit codes (`3` unauthenticated,
`4` forbidden, `6` no results) against a server that really produces them, and
the stdio server answering `tools/list` and one `tools/call`.

**Open decisions — these need a human.**
- Which repository's CI runs it. The stack lives in the platform repo; the code
  under test lives here. Running it there tests the merged platform against a
  published version; running it here tests this branch against a published
  platform. Both are useful and they are not the same test.
- How the version under test is chosen: the working tree, the last npm publish,
  or both.
- Which credentials the run uses, and where they are stored.

## 2. Contract drift between the generated client and the platform — **not started**

**The gap.** `src/models/` and `src/funcs/` are generated from the OpenAPI spec.
When the platform changes a response shape, the generated client goes stale and
nothing here notices; the first report is a user seeing a field come back
undefined.

This is not hypothetical. In a single week the platform repository shipped three
separate response-shape changes that broke its *own* response-validation tests
— `requestId` on error bodies, `rootRecordGroupId` on records, and `kind` /
`isDisabled` on users. Each was invisible on the pull request and surfaced hours
later in the nightly. This package has no equivalent check at all, so the same
class of change reaches a release here unseen.

**What to build.** A check that compares the committed generated models against
the platform's published spec and fails naming the field and the file. The
platform repo now runs two guards of exactly this shape
(`error-body-matches-the-spec.test.ts`, `test_graph_entity_schemas.py`); the
pattern transfers.

**Open decision.** Which spec is authoritative for this package — the `open-api`
repository, or `pipeshub-openapi.yaml` in the platform repo — and how a version
skew between a deployed platform and this client is meant to be expressed.

## 3. The hand-written tool layer — **in progress**

Eight tools, each wrapping several API calls. Current line coverage:

| File | Lines | What is untested |
| --- | --- | --- |
| `tools.ts` | 12.70% | registration, the flag surface, error mapping |
| `pipeshubDirectory.ts` | 34.50% | everything past argument parsing |
| `pipeshubSources.ts` | 39.68% | response shaping |
| `pipeshubSearch.ts` | 45.33% | response shaping |
| `_helpers.ts` | 59.33% | the SSE drain, agent and source listing |
| `pipeshubGetRecordContent.ts` | 56.43% | the content path |
| `pipeshubChat.ts` | 80.47% | streaming edges |

These are pure functions over fixtures — no infrastructure, no decisions
needed. The highest value is the error mapping, because it is what a client is
told when PipesHub does not answer, and §1 cannot reach every branch of it.

**Done so far.** `httpErrorResult`, `readValidated`, `expiredTokenError`,
`jsonResult` and `errorResult` — 20 tests. These matter more than their size
suggests: the streaming funcs set `errorCodes: []`, so a 401 or a 502 arrives
as an ordinary `Response` and `httpErrorResult` is the only thing between it
and the useless "stream ended without usable frames". The tests pin the
envelope shapes it lifts a message out of, that a nested object never renders
as `[object Object]`, that the credentials hint appears on 401 and 403 and not
on 404, 429 or 500, and that a 5000-character body is truncated instead of
filling the client's context.

**Next**, in order: `listAllSources` and `listAllAgents` paging (`_helpers.ts`
466–537), the SSE drain in `_agui.ts` against recorded frames, then
`tools.ts` registration and flag handling.

## 4. The CLI contract — **done**

`src/cli/config.ts` holds the contract AGENTS.md documents: the two token
variables and their order, the two URL variables, origin normalization,
`{origin}/mcp`, the exit codes, and the rule deciding whether a credential may
cross plain HTTP. It was at 13% line coverage.

59 tests now cover it, including the neighbours of every private range
(`172.15` / `172.32`, `fe70` / `fec0`, `fb00`) where a range check fails
quietly, and an assertion that `describeToken` never returns the token itself.

Writing them found two bugs, both shipped:

- **Every IPv6 address was allowed cleartext.** `cleartextAllowed` treats a host
  with no dot as a Compose or Kubernetes short name. IPv6 literals have no dot,
  so `http://[2606:4700:4700::1111]` was handed the bearer token in the clear,
  as was every other IPv6 host on the internet.
- **A blank `PIPESHUB_TOKEN` hid a working `PIPESHUB_MCP_TOKEN`.** The
  fallthrough used `??`, which only fires on unset. `tokenSource` trims per
  variable and so named the variable holding the token `resolveToken` had just
  refused to return — the disagreement between them is what gave it away.

Still thin in the same directory: `client.ts` (13.89%) and `init-qm.ts`
(22.97%). `client.ts` is largely §1's job. `init-qm.ts` writes the QM bundle and
is testable against a temporary directory.

## Standing rules for tests added here

**Test the hazard, not the fix.** A test whose double behaves differently from
the real thing passes without the bug being fixed. The cleartext tests pin the
*neighbours* of each private range, not the members, because a members-only
test passes against a rule that allows everything. The IPv6 cases were verified
by reverting the fix and watching exactly six of them fail.

**Never print, log or commit a PAT**, including in a fixture. Compare a 6-char
prefix. See AGENTS.md.

**Every test runs in CI already** — `bun test` runs on push and pull request,
and again before publish. Anything added here is enforced from the moment it
merges; nothing needs wiring up.
