# PipesHub MCP Tools

Reference for the tools exposed by the PipesHub MCP server. These tools let an AI client (Cursor, Claude Code, Gemini CLI, Claude.ai, LibreChat, etc.) talk to PipesHub — search and chat over the org's indexed documents, look up people and groups, and download files.

The server exposes hand-written tools that cover the common PipesHub workflows. Each one wraps several lower-level API calls so the LLM gets a single, well-shaped response.

**Recommended default: search and read.** An agent that can call tools answers best by running `pipeshub_search` and then reading the records that matter with `pipeshub_get_record_content`. `pipeshub_chat` is optional. In PipesHub's evaluation on 100 real questions about its own work (October 2026, Claude Opus as the agent, 200 answers per setup), search-and-read alone found 88% of the facts with 0.39 wrong claims per answer, at $0.54 and 78 seconds median per answer. Adding `pipeshub_chat` found the same 88%, with 0.47 wrong claims, at about $0.73 (estimated, since MCP does not report what PipesHub's assistant costs) and 97 seconds. Chat alone found 84%. For Claude Haiku the three setups were within 3 points of each other (71–74%), and search-and-read was the cheapest. The tool descriptions and server instructions steer agents this way. Guidance alone does not stop a capable agent from also calling chat, so to get the savings, leave chat out: set `PIPESHUB_MCP_CHAT=off` on the local server, or turn the tool off in the client (see [Leaving `pipeshub_chat` out](./README.md#leaving-pipeshub_chat-out)).

Keep `pipeshub_chat` when the client cannot run its own search-and-read loop, when you want PipesHub's own assistant to write the answer, to talk to a configured PipesHub agent, or to take an action through the user's connected tools.

---

### `pipeshub_chat`

**Optional.** Ask PipesHub's own assistant a question and get an answer with citations from the org's indexed sources (Drive, Box, Confluence, Slack, Gmail, Jira, the org's KB, etc.) and the live web. An agent that can call tools does as well with `pipeshub_search` and `pipeshub_get_record_content`, with fewer wrong claims, at lower cost and latency (see the recommendation above).

> **It can also take actions.** Plain chat runs PipesHub's assistant agent with every action the user has connected (for example creating a Jira ticket or sending an email), using their own credentials. Actions are on unless an admin turns them off. Ask it questions, and never ask it to write unless the user asked for that action. The tool is annotated `destructiveHint: true`, so clients that confirm risky calls will ask first.

> **Speed.** Every turn asks the backend for the short keyword-search wait (`keywordSearchBudget: "short"`): each search inside the assistant waits at most 5 seconds for its keyword (grep) matches after its vector results, and keeps what it found by then, instead of up to 35 seconds. Deployments running `HIGH_ACCURACY_MODE` still wait in full, and backends that predate the field ignore it.

| Argument | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The user's question or message for this turn. |
| `conversationId` | string | no | Existing conversation id to continue. Omit on the first turn; pass it back on every subsequent turn so the server-side history is preserved. |
| `filters` | object | no | Which sources the answer may use: `{ apps, kb }`. Connector ids go in `apps`, collection ids go in `kb`; get both from `pipeshub_sources`. Leave out to use all sources. Only works on the first turn. |
| `modelKey` | string | no | Model id from `pipeshub_sources` `llmModels[*].modelKey`. Defaults to the org's default LLM. |
| `agentId` | string | no | PipesHub agent to converse with (`agentId` from `pipeshub_agents`). Runs the turn against that agent's prompt, tools and knowledge. Pass the same `agentId` on every follow-up turn. Omit for plain chat. |

**When to pick it over the others:**
- The client cannot run several tool calls of its own, or the user asks for PipesHub's answer → `pipeshub_chat`.
- Talking to a configured PipesHub agent → `pipeshub_chat` with its `agentId`.
- Any other question about the org's knowledge, including open-ended and cross-document ones → `pipeshub_search`, then read the records that matter with `pipeshub_get_record_content`.
- "Find / locate the file named X" → `pipeshub_search` (then `pipeshub_download_record` if the user wants the bytes).

**Response:** the AI's `answer`, `citations[]`, `claims[]`, `uncitedSentences[]`, `followUpQuestions`, plus the `conversationId` to use for follow-ups; `notes[]` when the tool moved a scoping id to the right list or could not check the ids.

- Each citation carries its `number` (the `[N]` that marks it in the answer), `recordId`, `recordName`, `webUrl`, and the cited text as `passage`: the whole text, up to 1,500 characters (less when an answer has more than 16 citations, never under 400). A longer text is cut to a window around the first quote taken from it and carries `passageTruncated: true` and its full length in `passageChars`. `kind` says what the text is: `passage` (a block of the record, in its own words), `matchedText` (what keyword search matched in the record, in its own words), `summary` (PipesHub's summary of the record, not its words), `recordName` (the record was cited as a whole), or `web` (a web page, not an org record).
- Each claim is one cited sentence of the answer, with its citation numbers and `quotes`: the one or two lines of each cited text that share the most IDs, numbers and words with the sentence, copied verbatim. Quotes come only from `passage`, `matchedText` and `web` text. `notInCitedText` lists IDs, numbers or dates the sentence states that none of its cited texts, record names or links contain.
- `uncitedSentences` are sentences of four or more words that carry no citation.
- `evidenceNote` appears only when one of the above needs checking, and says what to do.

> The answer is PipesHub's assistant's synthesis of a few retrieved passages, so treat it as a lead. Before stating a specific ID, status, date, owner, or that something merged or shipped, check it against the claim's quotes, else confirm it in the cited record (`pipeshub_get_record_content` `mode:"content"`). A quote shows where to look, not that the claim is right. "Not found" means not in what it read, not that it does not exist.

---

### `pipeshub_search`

Vector / semantic search across the org's indexed documents. It is **the default first step for a question about the org's knowledge**: search, then read the records that matter with `pipeshub_get_record_content` and answer from them. It also **locates a document** by name, topic, or phrase and resolves it to a `recordId`.

| Argument | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Natural language query. |
| `limit` | number (1–100) | no | Vector matches to fetch. Default 10. The tool asks for the query to be searched as written. A PipesHub server that ignores that option rewrites it instead and searches the rewrite plus a few variants, `limit` matches each, so one call can return more records than `limit`. 5–10 is enough to find a `recordId`. |
| `offset` | number | no | Records to skip. To read the next page of the same results, pass the previous call's `nextOffset` with the same other arguments. |
| `apps` | string[] | no | Connector ids to search. Get them from `pipeshub_sources`, where `kind` is `"connector"`. Collection ids go in `kb`, not here. |
| `kb` | string[] | no | Collection (knowledge base) ids to search. Get them from `pipeshub_sources`, where `kind` is `"knowledgeBase"`. |
| `createdAfter` / `createdBefore` | string | no | Only records created in their source within these dates: when the record was written, not when an event in it happened. `YYYY-MM-DD` (that whole day, UTC) or an ISO 8601 datetime with a timezone. Both ends are inclusive. |
| `modifiedAfter` / `modifiedBefore` | string | no | Only records last changed in their source within these dates, in the same format. |
| `timeline` | `"created"` \| `"modified"` \| `"off"` | no | Search a span of time period by period, for how something evolved, what changed between two dates, or a summary over months. The span is the matching date bounds; records come back oldest first, each with its `period`. `limit` is then the matches per period. `"off"` asks for one ranked search where a newer server would search a long range period by period on its own (see Timeline); an older server refuses it. |

Leave out `apps` and `kb` to search everything. If you set either one, only the listed sources are searched.

The tool asks the server to search the query as written (`rewriteQuery: false`), without the model rewrite and expanded variants PipesHub adds to a search from the web app. That saves two model calls on every search (about 4 s in the v3 eval); an agent already writes its own queries. A PipesHub server older than that option ignores it: it searches a rewritten form of the query and two variants, as before, not the query as written.

On a plain search, the date filters match when a record was written or last changed at its source, not the date of an event it describes, so a page written weeks after an event is left out of a search bounded around the event. Leave them off unless the question is about when records were written. A timeline is the exception: its span is those bounds, so set them to the span, widened past its end to take in write-ups made later. With no start, the server covers the year before the end, so an older span named in the question is not searched unless the bounds say so.

**Timeline.** A plain search returns the best matches, which bunch around the single best-matching moment, so a summary over months covers that moment and misses the rest. With `timeline` set, PipesHub splits the span into up to 6 periods (calendar months, or weeks within one month), searches each on its own beside one search of the whole span, and returns the records oldest first. Each record carries the `period` it is dated in, and `timeline` lists the periods with how many records each holds. A period with no records may only mean nothing matched the query then. It is the same search PipesHub's own assistant runs for these questions, with the same permissions and filters as a plain search. A PipesHub server older than the option, or one whose `TIMELINE_SUMMARIES` setting is `false`, runs a plain search instead; the tool returns it as ranked and says so in `notes`. A newer server also runs a timeline on its own when the dates on one field have a start and cover more than 31 days and `timeline` is left out; the tool shapes that result the same way and passes on the server's note. Send `timeline: "off"` for one ranked search instead.

A record with no source date is left out whenever a bound on that date is set. A date the server cannot read is an error that says why. A PipesHub server older than the date filter ignores the bounds; the tool then removes the records outside them and says so in `notes`, but fewer remain than a server that filters would find.

**Outside your dates.** A newer PipesHub server also runs a search that has date bounds once without them, with the same filters and permissions, and returns its best matches written outside the bounds apart from the results: release notes, a retrospective or a weekly summary written after the period asked about. The tool passes them on as `outsideDates`, on the first page: a `note` and up to 3 `records`, each shaped like the results with its `createdAt` / `updatedAt` and its best passage. `records` stays exactly what the bounds allow. A server older than this, or one whose `DATE_FILTER_SAFETY_NET` setting is `false`, sends none.

**Response:** `records[]`, one entry per record, best match first: `recordId`, `recordName`, `recordType`, `connector`, `webUrl`, the source's `createdAt` / `updatedAt` (ISO 8601), `parent` (the channel, space, project or PR it sits in, by name), `status` (a ticket's or pull request's state with its merge, close, resolution or due date, assignee and priority, e.g. `Merged 2026-09-25 by alice`), `links` (up to 3 records it names or is named by, one line each with type, name, status and recordId; `linksFound` when more exist), `score`, `passagesFound` (how many passages the search found in it) and up to 3 `passages`. Also `totalRecords`, `outsideDates` (see above) when a dated search found matches outside its dates, and `notes[]` when the tool moved a scoping id to the right list, could not check the ids, or cut the list.

A result stays under 20,000 characters. When records were left out to fit, `nextOffset` is set and the last note says so; call again with the same arguments and `offset: nextOffset`. That page comes from the same results, held briefly for the same caller, not from a new search. If they are no longer held, the search runs again and a note says the ranking may differ.

> Records are the best-matching ones, with a sample of their passages — not every record that matches. Never count them to answer "how many" / "all" / "every"; navigate the record group with `pipeshub_get_record_content` `mode:"navigate"`, which reports the group's real total.
>
> For a **specific named document**, don't stop at search — take the top hit's `recordId` and call `pipeshub_get_record_content` to read/summarize it. For questions that span many documents, read each record that matters.

Each passage's `text` is at most 350 characters, plus the ` …` mark when it was cut. A passage up to 350 characters is shown whole. A longer one shows at least its first 280 characters and is cut at the first sentence or line end between characters 280 and 350, or else at the last space before 350, and ends in ` …`. A passage that was cut carries `truncated: true` and its full length in `contentChars`. Within a record, the passages the search matched come first, by score, then the passages around them.

---

### `pipeshub_download_record`

Download the file as stored for one record — not PipesHub's parsed content, metadata header, or summary.

**Use it when the user wants the file itself** (download, attach, open, or a PDF preview). **Do not use it to read, summarize, or quote a document** regardless of format — that is `pipeshub_get_record_content` `mode:"content"`. Text formats come back inline; images, audio, and other binary as base64.

| Argument | Type | Required | Description |
|---|---|---|---|
| `recordId` | string | yes | Record identifier — UUID for connector-sourced records or 24-char ObjectId for uploaded ones. Get it from a chat citation or `pipeshub_search` hit. |
| `convertTo` | string | no | The only conversion target connectors honour is `application/pdf` (the MIME type, not `pdf`). A bare `pdf` is ignored with no error. Omit for the file as stored. |

**Response:** the file as stored. `Content-Type` is forwarded from the upstream service. Text formats (`text/*`, JSON, XML, YAML) are inline; images, audio, and other binary are base64.

---

### `pipeshub_get_record_content`

Four operations on records, selected by `mode`.

| Argument | Type | Required | Description |
|---|---|---|---|
| `mode` | enum | no | `content` (default), `thread`, `navigate`, or `lookup`. |
| `recordId` | string | conditional | Required when `mode` is `content` or `thread`. UUID for connector-sourced records or 24-char ObjectId for uploaded ones. Get it from a chat citation, a `pipeshub_search` result, or a `lookup`. |
| `maxChars` | number (2000–140000) | no | `content` and `thread`. Most characters of text to return. Default 40000 (about 10k tokens). |
| `query` | string | no | `content` only. What you are looking for. When the record is longer than `maxChars`, the most relevant passages come back first, with the skipped block ranges marked. Ignored when `startBlock` is given. |
| `startBlock` | number | no | `content` and `thread`. Read in order from this block, the value in a previous read's `Next:` line (0 reads from the top). In `thread` mode it applies to the record at `startRecord`. |
| `startRecord` | number | no | `thread` only. Continue a long thread from this record, with the `startBlock` given beside it in the `Next:` line. |
| `nodeId` | string | no | `navigate` only. The node to open; omit for a flat listing of everything reachable, newest first. A URL or issue key resolves automatically. |
| `page` / `limit` | number | no | `navigate` only. 1-based page, 50–200 children per page (default 50). A `limit` under 50 is rejected, not raised. |
| `depth` | number (1–3) | no | `navigate` only. Above 1 the listing flattens to all descendants down to that level, each row carrying its own `level`. Default 1. |
| `nodeTypes` | string[] | no | `navigate` only. Restrict children to these node types, e.g. `["record", "folder"]`. |
| `createdAfter` / `createdBefore` | string | no | `navigate` only. Filter children by source creation time. ISO 8601 `YYYY-MM-DD` (inclusive of the whole day), or a full datetime that **must** carry a timezone offset. |
| `modifiedAfter` / `modifiedBefore` | string | no | `navigate` only. Same, against source modification time. |
| `identifiers` | string \| string[] | conditional | Required when `mode` is `lookup`. A URL, issue key, or external ID — or up to 10 of them. |
| `connectorName` | string | no | `lookup` only. Hint that prioritises resolution order (e.g. `JIRA`, `GOOGLE_DRIVE`). Cannot widen beyond accessible connectors. |

**`mode: "content"`** (default) — the only way to read one record's full text. Use it for any task that depends on the complete document (summarize, extract all of something, verify a mention, translate, review, compare docs). Prefer it over `pipeshub_download_record` when you need what the record *says* rather than the original file bytes. Returns a metadata header (title, source, key fields such as a ticket's or PR's status and its merge or resolution date, Web URL, pre-generated summary, and on newer servers the records it names or is named by, with their type and status) followed by the parsed text, up to `maxChars` characters. A longer record comes back in parts. Each part ends with a `Read:` line saying which blocks were shown, of how many, and, while anything is left, a `Next:` line naming the exact call that reads on (`startBlock`). To read the whole record, follow `Next:` until a part ends with no `Next:` line; its `Read:` line then says the whole record, or the end of it, was read, and names any block that could not be returned. For a question about part of a long record, pass `query` to get the relevant passages first; the `Read:` line then lists the block ranges shown and offers the call that reads the record in order instead. Against a PipesHub server from before paged reads, the whole record comes back in one string with no `Read:` line. `No record found` does not mean the record does not exist: on servers from before the not-indexed change it is also the answer for a record that exists but whose content is not indexed yet. Newer servers answer that case with the record's metadata and a `Not indexed:` paragraph naming its status, and keep `No record found` for an indexed record whose stored content could not be loaded. A record that does not exist, or that you may not read, is a `403`.

> One record is not always the whole conversation. A Slack record is one burst of messages; thread replies are separate records, and `Reply Count: N` in the text means those replies are not included. Read them with `mode: "thread"`. GitHub pull request records include diffs and changed files, and can be far larger than a client's tool-output limit; they come back in parts.

**`mode: "thread"`** — every message of the Slack thread that `recordId` belongs to, parent first, oldest to newest, limited to what the caller may see. Pass any reply, or a channel message that has replies. A long thread comes back in parts; its `Next:` line names both `startRecord` and `startBlock`, and a reply that was cut short keeps the cursor until it has been read to its end. Replies whose stored content could not be loaded are named. A record that is not part of a thread is an error saying so. A PipesHub server from before thread reads returns only the named record, with a note saying it cannot read the thread.

**`mode: "navigate"`** — browse the hierarchy: RecordGroup (project / space / drive / folder) → Record (epic / story / page / file) → children. Use it when the question is about structure rather than wording (what is under this epic, which pages sit in a space, what links to a ticket) — `pipeshub_search` ranks by content and cannot show how records relate. Opening a record also prints that record's own metadata, so a question about one record is often answered by this call alone. Returns no document text.

`Related` lists only links recorded inside a source (Jira issue links, GitHub blocked-by), not Slack messages or pages that mention the record. To find discussion of a PR or ticket, `pipeshub_search` for its number or URL with the Slack connector id in `apps`.

Pass `depth: 2` or `3` to see several levels in one call — an epic's stories *and* their subtasks — instead of one call per level; use it whenever the question needs a hierarchy overview rather than a single node. One page is usually every child, so only pass `page: 2` when the `Next:` line says more exist.

**`mode: "lookup"`** — resolve an external reference (Jira key or URL, Confluence/Drive/Slack link, bare external ID) to a recordId plus that record's metadata. Searches all connectors the caller can access, regardless of any source filter used elsewhere. A miss is a 200 with empty `matches` and the input echoed in `not_found_identifiers` — which may mean no-access rather than non-existence.

**Response for `navigate` and `lookup`:** a rendered flat-text view whose closing `Next:` line names the exact follow-up call to make.

---

### `pipeshub_directory`

Look up people, groups, and teams in PipesHub. One tool with five `action`s. Not for documents or files — that is `pipeshub_search`.

| Argument | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | One of `whoami`, `list_users`, `get_user`, `list_groups`, `list_my_teams`. |
| `userId` | string | conditional | Required when `action` is `get_user`. 24-char ObjectId. From `whoami` or a `list_users` hit. |
| `page` | number | no | 1-based page for `list_*`. Omit for page 1. |
| `limit` | number (1–100) | no | Items per page for `list_*`. Omit for the per-action SDK default. |
| `search` | string | no | Substring match on `list_users` (name / email), `list_groups` (name), and `list_my_teams` (name). |

**Actions:**
- `whoami` — the authenticated user's identity. Errors if the credential is expired or revoked. No other args.
- `list_users` — paginated list of org users.
- `get_user` — full profile for one user (requires `userId`).
- `list_groups` — paginated list of user groups, with `userCount`.
- `list_my_teams` — teams the caller belongs to, with `canEdit` / `canDelete` / `canManageMembers` flags.

`list_*` returns an empty `users` / `groups` / `teams` array when nothing matches — that is not an error. `pagination.hasNextPage` (teams: `hasNext`) says whether to request the next page.

---

### `pipeshub_sources`

Discover available chat sources and AI models in one call. Call this once at the start of a session and cache the result — sources and models change infrequently.

| Argument | Type | Required | Description |
|---|---|---|---|
| `include` | enum[] | no | Which sections to fetch. Default: `["sources", "llmModels"]`. Add `"embeddingModels"` if configuring re-embedding. |

**Response:** up to three sections.
- `sources` — connectors (`kind: "connector"`) and collections (`kind: "knowledgeBase"`). For `pipeshub_search` and `pipeshub_chat`, pass connector ids in `apps` and collection ids in `kb`. `sourcesTruncated: true` means the listing stopped at 1,000 sources.
  - Each source carries `coverage`: `{ indexed, total, notIndexed }`. Search and chat find only the `indexed` records; `notIndexed` counts records that exist but whose content is not indexed yet, by status (`AUTO_INDEX_OFF`, `QUEUED`, `FAILED`, ...). When any source is partly indexed, or has no `coverage`, `coverageNote` says what that means for a search that finds nothing. Counts are read for the first 100 sources. A source whose counts this account cannot open (a team connector it did not create, unless it is an admin; a collection where its role is below reader) or that could not be read has no `coverage`, and `notes` says why.
- `llmModels` — chat / generation models. Each `modelKey` is the value to pass as `modelKey` to `pipeshub_chat`. Pick `isDefault: true` unless the user asks for a specific model.
- `embeddingModels` — vector embedding models (only when explicitly requested).

---

### `pipeshub_agents`

List the PipesHub **agents** configured for this org. To converse with one, take its `agentId` and pass it to `pipeshub_chat`.

Each agent is returned as `{ agentId, name, description, systemPrompt, startMessage, tags, webSearch, isActive, toolsets, knowledge }`.

**Route on `toolsets` / `knowledge`, not the name** — names are often generic. Match the request to the agent whose tools can actually perform it (e.g. "create a Jira ticket" → the agent whose toolset includes `jira.create_issue`). If no agent has a tool for the requested action, call `pipeshub_chat` without an `agentId`: plain chat can use the user's connected tools.

The list **may be empty**. For plain Q&A, use `pipeshub_search` and read the records with `pipeshub_get_record_content`.

---

## Quick Decision Guide

| User says... | Use this tool |
|---|---|
| "What does the Q4 report say about ARR?" | `pipeshub_search` → top hit → `pipeshub_get_record_content` |
| "Summarize the onboarding doc" | `pipeshub_search` → top hit → `pipeshub_get_record_content` |
| "What do we know about X?" (spans many docs) | `pipeshub_search` → read the records that matter with `pipeshub_get_record_content` |
| "What's our PTO policy?" (no single named file) | `pipeshub_search` → read the top records with `pipeshub_get_record_content` |
| The client cannot run its own tool loop, or wants PipesHub's own answer | `pipeshub_chat` |
| "How many / list all / every X" | `pipeshub_get_record_content` `mode:"navigate"` — not `pipeshub_chat` |
| "Find the file called *security-review.pdf*" | `pipeshub_search` |
| "Download that file" (after a search or chat citation) | `pipeshub_download_record` |
| "What does this PDF say?" / summarize a named file | `pipeshub_get_record_content` `mode:"content"` — not download |
| "Show me the full content of that record" | `pipeshub_get_record_content` |
| "Who am I?" / "What's my user id?" | `pipeshub_directory` (`whoami`) |
| "Who is X?" / "List everyone on the data team" | `pipeshub_directory` (`list_users` / `list_my_teams`) — not `pipeshub_search` |
| First call of a session, before chat or search | `pipeshub_sources` (cache the result) |
| "Create a Jira ticket" / talk to a configured agent | `pipeshub_agents` → `pipeshub_chat` with that `agentId`; if no agent fits an action, `pipeshub_chat` without one |
