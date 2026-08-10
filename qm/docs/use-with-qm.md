# Use PipesHub with QM

Draft for docs.pipeshub.com. Audience: an operator who already runs QM and wants
their agents answering from company documents.

---

QM agents can answer from your organization's Drive, Slack, Gmail, Jira,
Confluence, and knowledge base — with each person's answers bounded by their own
PipesHub permissions.

## How it fits together

QM's agent has a small, fixed tool surface, and the important one is `execute` —
run a command inside that person's sandbox. So the integration is not a
connector or a plugin. It is:

1. A command-line program installed into the sandbox image.
2. A `tool.json` telling QM the command exists and what rules govern it.
3. A `SKILL.md` telling the agent when to reach for it.

Under the hood the CLI talks to the `/mcp` endpoint your PipesHub instance
already exposes — one tool contract, not two.

**QM cannot attach PipesHub's MCP endpoint directly.** QM uses MCP in the
opposite direction: it is an MCP *server* exposing its own tools to its harness,
with `strictMcpConfig: true` forbidding external servers. There is no MCP
attachment surface. Don't spend time looking for one.

## Before you start

Two prerequisites that are QM's shape rather than PipesHub's, and both surprise
people:

**Your PipesHub must be reachable from the public internet over HTTPS.** QM
agent sandboxes do not run on the operator's machine — with the `sprites`
backend they run on Fly, with `aws` in Lambda MicroVMs. Even `target: docker`
only makes QM's core and web UI local. So `localhost`, `host.docker.internal`,
and LAN addresses are unreachable from a sandbox, and the CLI refuses to send
credentials in cleartext to a public host.

**Sandboxes need a Fly Sprites or AWS credential.** The `sprites` backend
requires a `SPRITES_TOKEN` from Fly Sprites — a separate service from Fly, with
its own identity system. A Fly account alone is not sufficient. Without a
sandbox backend, QM agents cannot execute commands at all.

Neither is something PipesHub can remove. Budget for them before you start.

## Admin setup

Roughly ten minutes, once.

1. Scaffold the bundle into your QM deployment directory:

   ```bash
   npm install -g @pipeshub-ai/mcp
   pipeshub init-qm /path/to/your-qm-deployment
   ```

   The command stamps the Dockerfile's version pin from the package you just
   installed, so the bundle and the CLI it configures cannot drift apart. It is
   safe to re-run: existing files are kept rather than overwritten.
2. In `qm.config.jsonc`, set the origin under `sandbox.env`:

   ```jsonc
   "sandbox": {
     "env": { "PIPESHUB_BASE_URL": "https://pipeshub.your-company.com" }
   }
   ```

   An origin with no path — the CLI appends `/mcp` itself.
3. Set `egress` in `sandbox/tools/pipeshub/tool.json` to your hostname.
4. `qm check && qm sandbox publish && qm up`

Do **not** put anyone's token in `sandbox.secretEnv`. That is delivered to every
sandbox in the deployment and would hand one person's credential to the whole
organization.

## Per-person setup

Under a minute, once.

1. In PipesHub: **Developer Settings → Personal Access Tokens → Create**.
2. **Deselect every scope**, then select only:

   ```text
   conversation:chat   semantic:write   kb:read   user:read   connector:read
   ```

   The panel pre-selects everything; accepting the default grants far more than
   this integration needs.
3. Set expiry to 30 days.
4. In QM, add it to **your own** keychain — not a shared room:

   ```text
   service: pipeshub
   kind:    env
   value:   the token value only, no URL and no variable name
   ```

It arrives as `$PIPESHUB_TOKEN` in your sandbox on the next turn. No grant
ceremony: in your own scope, your own keychain credentials materialize
automatically.

> **If you copied our two-line paste block, that's the wrong shape here.** The
> block containing `PIPESHUB_MCP_URL=` and `PIPESHUB_MCP_TOKEN=` is for a local
> MCP client. A QM keychain entry is one secret value, and the base URL is the
> admin's job.

**Never paste a token into a chat message.** Transcripts are durable and pass
through the model provider. The keychain exists precisely so credentials never
take that path — and the CLI has no command that accepts one as an argument.

## What your agents can do

| Someone asks | The agent runs |
| --- | --- |
| "What does the Q4 report say about ARR?" | `pipeshub ask` |
| "Find security-review.pdf" | `pipeshub search` |
| "Summarize the onboarding doc" | `pipeshub search` then `pipeshub get` |
| "Download that file" | `pipeshub get --out` |

Every result carries `recordId` and `webUrl`, so answers cite their sources.

## Two behaviours worth understanding

**Permissions are enforced, not approximated.** A person asking for a document
they cannot access gets a `403` — not a vague empty result — and that holds even
when they name the record directly.

**An uncited answer is treated as unsupported.** If `ask` produces prose with no
citations, the CLI exits `6` and the agent is instructed to say the documents do
not appear to contain it. This matters because such an answer can read fluently
and even carry a high server-side confidence score; confidence does not track
groundedness, so citations are what the rule keys off.

## Cost

`ask` runs a language model on the PipesHub side. That spend sits outside QM's
budget windows and rate limits. Prefer `search` when locating something is
enough, and cache `sources`.
