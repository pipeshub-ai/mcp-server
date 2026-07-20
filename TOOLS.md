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
| `chatMode` | enum | no | `quick` (low-retrieval, fast) or `balanced` (full RAG). Default `quick`. |

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

Read a record's parsed content — the only way to see a document's full text. Use it for any task that depends on a document's complete content (summarize, extract all of something, verify a mention, translate, review, compare docs). Prefer this over `pipeshub_download_record` when you need to read what the record says without downloading the original file.

| Argument | Type | Required | Description |
|---|---|---|---|
| `recordId` | string | yes | Record identifier — UUID for connector-sourced records or 24-char ObjectId for uploaded ones. Get it from a chat citation or `pipeshub_search` hit. |
| `fetchFullContent` | boolean | no | Default `false` — returns record fields + the `context_metadata` summary only. Set `true` to include `block_containers` (the full parsed text) — required for summarize / extract / any whole-document task. |

**Response:** a JSON object with a `record` field (snake_case keys). `record.context_metadata` is a short pre-generated summary; `record.block_containers` (with `fetchFullContent: true`) is the full parsed content.

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
