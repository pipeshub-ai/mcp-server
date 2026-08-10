# PipesHub MCP Tools

Reference for the tools exposed by the PipesHub MCP server. These tools let an AI client (Cursor, Claude Code, Gemini CLI, Claude.ai, LibreChat, etc.) talk to PipesHub — search and chat over the org's indexed documents, look up people and groups, and download files.

The server exposes hand-written tools that cover the common PipesHub workflows. Each one wraps several lower-level API calls so the LLM gets a single, well-shaped response.

---

### `pipeshub_chat`

**Default tool for anything PipesHub-related.** Ask a question and get a grounded answer with citations from the org's indexed sources (Drive, Box, Confluence, Slack, Gmail, Jira, the org's KB, etc.).

| Argument | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The user's question or message for this turn. |
| `conversationId` | string | no | Existing conversation id to continue. Omit on the first turn; pass it back on every subsequent turn so the server-side history is preserved. |
| `filters` | object | no | Source scoping — `{ apps: string[] }` of connector instance UUIDs and/or `knowledgeBase_<orgId>`. Get ids from `pipeshub_sources`. Only meaningful on the first turn. |
| `modelKey` | string | no | Model id from `pipeshub_sources` `models[*].modelKey`. Defaults to the org's default LLM. |
| `agentId` | string | no | PipesHub agent to converse with (`agentId` from `pipeshub_agents`). Runs the turn against that agent's prompt, tools and knowledge. Pass the same `agentId` on every follow-up turn. Omit for plain chat. |
| `chatMode` | enum | no | `internal_search` (default) or `web_search` — the plain-chat modes. `quick` is agent-only; see below. |

**`chatMode` depends on `agentId`:**
- **Without `agentId`** (plain chat): `internal_search` answers from the org's indexed knowledge (default), `web_search` from the live web. Anything else collapses to `internal_search`.
- **With `agentId`** (agent chat): `quick` is the only mode the agent stream accepts, and the tool sends it automatically — omit `chatMode`.
- `quick` requires an `agentId`. Sent without one it is ignored and the turn runs as `internal_search`, so include `agentId` whenever you want `quick`.

**When to pick it over the others:**
- Open-ended / cross-document org questions (answer spans many files) → `pipeshub_chat`.
- "What's our policy on Y?" (not tied to one named file) → `pipeshub_chat`.
- "Summarize *a specific doc*" or "What does *document* say about X?" → `pipeshub_search` → top hit's `recordId` → `pipeshub_get_record_content` (not `pipeshub_chat`).
- "Find / locate the file named X" → `pipeshub_search` (then `pipeshub_download_record` if the user wants the bytes).

**Response:** the AI's `answer`, `citations[]` (each with `recordId`), `followUpQuestions`, plus the `conversationId` to use for follow-ups.

---

### `pipeshub_search`

Vector / semantic search across the org's indexed documents. Use it to **locate a document** — by name, topic, or a phrase — and to resolve it to a `recordId`. It is also **step 1 of reading/summarizing a specific document**: search, take the top hit's `recordId`, then call `pipeshub_get_record_content`.

| Argument | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Natural language query. |
| `limit` | number (1–100) | no | Max number of result chunks. Default 10. Use 5–10 when resolving a filename to a `recordId`. |
| `apps` | string[] | no | Source-scoping ids — connector instance UUIDs and/or `knowledgeBase_<orgId>`. Get them from `pipeshub_sources`. |

**Response:** `hits[]` (`recordId`, `recordName`, `score`, `snippet`, `mimeType`, `webUrl`) sorted by score, plus `uniqueRecords[]` for deduped record-level info.

> Hits are the top-scoring **blocks** from the best-matching records — not all blocks of any record, and not every record that matches. Never count them to answer "how many" / "all" / "every"; navigate the record group with `pipeshub_get_record_content` `mode:"navigate"`, which reports the group's real total.
>
> For a **specific named document**, don't stop at search — take the top hit's `recordId` and call `pipeshub_get_record_content` to read/summarize it. Reserve `pipeshub_chat` for open-ended questions that span many documents.

---

### `pipeshub_download_record`

Stream the binary content of a single record. Use it when the user wants the actual file bytes (download, attach, open).

| Argument | Type | Required | Description |
|---|---|---|---|
| `recordId` | string | yes | Record identifier — UUID for connector-sourced records or 24-char ObjectId for uploaded ones. Get it from a chat citation or `pipeshub_search` hit. |
| `convertTo` | string | no | Optional server-side format conversion target (e.g. `pdf`). Omit for the original bytes. |

**Response:** the file content. `Content-Type` is forwarded from the upstream service. Binary content is base64-encoded; text is inline.

---

### `pipeshub_get_record_content`

Three operations on records, selected by `mode`.

| Argument | Type | Required | Description |
|---|---|---|---|
| `mode` | enum | no | `content` (default), `navigate`, or `lookup`. |
| `recordId` | string | conditional | Required when `mode` is `content`. UUID for connector-sourced records or 24-char ObjectId for uploaded ones. Get it from a chat citation, a `pipeshub_search` hit, or a `lookup`. |
| `nodeId` | string | no | `navigate` only. The node to open; omit for a flat listing of everything reachable, newest first. A URL or issue key resolves automatically. |
| `page` / `limit` | number | no | `navigate` only. 1-based page, 50–200 children per page (default 50). A `limit` under 50 is rejected, not raised. |
| `depth` | number (1–3) | no | `navigate` only. Above 1 the listing flattens to all descendants down to that level, each row carrying its own `level`. Default 1. |
| `nodeTypes` | string[] | no | `navigate` only. Restrict children to these node types, e.g. `["record", "folder"]`. |
| `createdAfter` / `createdBefore` | string | no | `navigate` only. Filter children by source creation time. ISO 8601 `YYYY-MM-DD` (inclusive of the whole day), or a full datetime that **must** carry a timezone offset. |
| `modifiedAfter` / `modifiedBefore` | string | no | `navigate` only. Same, against source modification time. |
| `identifiers` | string \| string[] | conditional | Required when `mode` is `lookup`. A URL, issue key, or external ID — or up to 10 of them. |
| `connectorName` | string | no | `lookup` only. Hint that prioritises resolution order (e.g. `JIRA`, `GOOGLE_DRIVE`). Cannot widen beyond accessible connectors. |

**`mode: "content"`** (default) — the only way to see a document's full text. Use it for any task that depends on the complete document (summarize, extract all of something, verify a mention, translate, review, compare docs). Prefer it over `pipeshub_download_record` when you need what the record *says* rather than the original file bytes. Returns a single `content` string: a metadata header (title, source, key fields, Web URL, pre-generated summary) followed by the full parsed text. A record with no extractable content returns the literal `No record found`.

**`mode: "navigate"`** — browse the hierarchy: RecordGroup (project / space / drive / folder) → Record (epic / story / page / file) → children. Use it when the question is about structure rather than wording (what is under this epic, which pages sit in a space, what links to a ticket) — `pipeshub_search` ranks by content and cannot show how records relate. Opening a record also prints that record's own metadata, so a question about one record is often answered by this call alone. Returns no document text.

Pass `depth: 2` or `3` to see several levels in one call — an epic's stories *and* their subtasks — instead of one call per level; use it whenever the question needs a hierarchy overview rather than a single node. One page is usually every child, so only pass `page: 2` when the `Next:` line says more exist.

**`mode: "lookup"`** — resolve an external reference (Jira key or URL, Confluence/Drive/Slack link, bare external ID) to a recordId plus that record's metadata. Searches all connectors the caller can access, regardless of any source filter used elsewhere. A miss is a 200 with empty `matches` and the input echoed in `not_found_identifiers` — which may mean no-access rather than non-existence.

**Response for `navigate` and `lookup`:** a rendered flat-text view whose closing `Next:` line names the exact follow-up call to make.

---

### `pipeshub_directory`

Look up people, groups, and teams in PipesHub. One tool with five `action`s.

| Argument | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | One of `whoami`, `list_users`, `get_user`, `list_groups`, `list_my_teams`. |
| `userId` | string | conditional | Required when `action` is `get_user`. 24-char ObjectId. |
| `page` | number | no | 1-based page number for `list_*` actions. |
| `limit` | number (1–100) | no | Items per page for `list_*` actions. |
| `search` | string | no | Substring match against name / email. Used by `list_users`. |

**Actions:**
- `whoami` — return the authenticated user's identity (decoded from the bearer JWT). No other args.
- `list_users` — paginated list of org users.
- `get_user` — full profile for one user (requires `userId`).
- `list_groups` — paginated list of user groups, with `userCount`.
- `list_my_teams` — teams the caller belongs to, with `canEdit` / `canDelete` / `canManageMembers` flags.

---

### `pipeshub_sources`

Discover available chat sources and AI models in one call. Call this once at the start of a session and cache the result — sources and models change infrequently.

| Argument | Type | Required | Description |
|---|---|---|---|
| `include` | enum[] | no | Which sections to fetch. Default: `["sources", "llmModels"]`. Add `"embeddingModels"` if configuring re-embedding. |

**Response:** up to three sections.
- `sources` — every connector instance plus the synthetic `knowledgeBase_<orgId>` entry. Each `id` is the value to put in `pipeshub_chat`'s or `pipeshub_search`'s `apps` filter.
- `llmModels` — chat / generation models. Each `modelKey` is the value to pass as `modelKey` to chat/search. Pick `isDefault: true` unless the user asks for a specific model.
- `embeddingModels` — vector embedding models (only when explicitly requested).

---

## Quick Decision Guide

| User says... | Use this tool |
|---|---|
| "What does the Q4 report say about ARR?" | `pipeshub_search` → top hit → `pipeshub_get_record_content` |
| "Summarize the onboarding doc" | `pipeshub_search` → top hit → `pipeshub_get_record_content` |
| "What do we know about X?" (spans many docs) | `pipeshub_chat` |
| "What's our PTO policy?" (no single named file) | `pipeshub_chat` |
| "Find the file called *security-review.pdf*" | `pipeshub_search` |
| "Download that file" (after a search or chat citation) | `pipeshub_download_record` |
| "Show me the full content of that record" | `pipeshub_get_record_content` |
| "Who am I?" / "What's my user id?" | `pipeshub_directory` (`whoami`) |
| "List everyone on the data team" | `pipeshub_directory` (`list_users` / `list_my_teams`) |
| First call of a session, before chat or search | `pipeshub_sources` (cache the result) |
