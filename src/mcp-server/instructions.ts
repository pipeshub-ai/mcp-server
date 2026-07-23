// Shared routing guidance for the host LLM. Surfaced two ways:
//   1. As the server `instructions` (always present at `initialize`).
//   2. As the body of the user-invokable `pipeshub-assistant` prompt.
// Keeping it in one place avoids the two copies drifting apart.

export const PIPESHUB_INSTRUCTIONS = `# PipesHub MCP — instructions for the LLM

PipesHub is the user's workplace AI platform. It indexes their documents,
knowledge base content, and connector sources (Drive, Box, Confluence,
Slack, Jira, Gmail, ...). When in doubt, the answer is in PipesHub.

## Full-document tasks: \`pipeshub_search\` → \`pipeshub_get_record_content\`

\`pipeshub_chat\` answers from a handful of retrieved passages — it never
reads a whole document. Whenever the task depends on a document's
COMPLETE content, fetch the document itself:

1. \`pipeshub_search\` with the document's name / topic.
2. Take the top hit's \`recordId\`.
3. \`pipeshub_get_record_content\`, and answer from the returned content.

Tasks that need this path — anything where missing part of the document
could make the answer wrong:

- Summarize / TL;DR / key points / takeaways / action items of a doc.
- Extract or list ALL of something (dates, owners, requirements, ...).
- Check whether / where a doc mentions something.
- Translate, rewrite, outline, review, or reformat a doc.
- Compare named docs (fetch each \`recordId\`).
- Any question explicitly scoped to ONE named document — chat retrieval
  cannot be restricted to a single record.

## Default tool: \`pipeshub_chat\`

**Use \`pipeshub_chat\` for any question that could plausibly be answered
by the user's PipesHub-indexed data** and is not a full-document task:

- A question that may span several documents, or where you don't yet
  know which record holds the answer (e.g. "what did Aashil say about
  onboarding?").
- Anything about company / org policies, processes, decisions, or
  history (e.g. "what's our vacation policy?", "who owns the auth
  service?").
- Anything explicitly mentioning PipesHub itself, or its sources
  (Drive / Box / Confluence / Slack / Gmail / Jira / etc.) when the
  user has those connected.
- Open-ended "what do we know about X" questions where the answer
  likely lives in the org's documents.

Do NOT answer those from your own knowledge — \`pipeshub_chat\` grounds
the answer in the user's actual indexed content and returns citations
the user can verify.

## When to use the other tools

- \`pipeshub_search\` — locate a document by name or topic and resolve it
  to a \`recordId\`. To read or summarize one specific document, search,
  then pass the top hit's \`recordId\` to \`pipeshub_get_record_content\`.
- \`pipeshub_download_record\` — when the user wants the actual file
  bytes (download, attach, open). Get the \`recordId\` either from
  citations on a prior \`pipeshub_chat\` response or from
  \`pipeshub_search\`.
- \`pipeshub_get_record_content\` — when you need a record's full parsed
  content (returned as a single \`content\` string: metadata header plus
  the document's text) without downloading the original file. Prefer this
  over download when the question is about what the record says.
- \`pipeshub_directory\` — people, groups, teams, and \`whoami\` lookups.
  Not for documents.
- \`pipeshub_sources\` — call once at the start of a session to discover
  which connectors / KB / models are available, then cache the result.
- \`pipeshub_agents\` — list the org's configured **agents** (specialized
  assistants with their own prompt, tools, and knowledge scope).

## Agents

Some orgs configure **agents** for specific jobs (e.g. a Slack messenger, a
Jira ticket creator, a Salesforce CRM updater). To run a turn against an
agent, call \`pipeshub_chat\` with its \`agentId\` (from \`pipeshub_agents\`)
— optionally with an agent \`chatMode\` (\`auto\` by default, or \`quick\` /
\`verification\` / \`deep\`). Keep passing the same \`agentId\` plus the
returned \`conversationId\` on follow-up turns.

**When to route to an agent vs plain chat:**
- The user names a system/action that maps to an agent (e.g. "post to
  Slack", "create a Jira ticket", "update the Salesforce deal") → call
  \`pipeshub_agents\`, pick the matching agent, and use it.
- Plain question about the org's knowledge or the public web → just use
  \`pipeshub_chat\` (no \`agentId\`) with \`internal_search\` or \`web_search\`.

**If you are unsure which agent or route fits the request**, call
\`pipeshub_agents\` FIRST and read the returned names/descriptions, then
either pick the best match or present the list to the user and let them
choose. Do NOT guess an agent blindly, and do NOT refuse — list the agents
and decide from real data. The list may be empty (no agents configured),
in which case fall back to plain \`pipeshub_chat\`.

## Conversation lifecycle

\`pipeshub_chat\` is a single tool that handles both starting and
continuing conversations (plain or with an \`agentId\`). On the first turn
omit \`conversationId\`; on every subsequent turn pass back the
\`conversationId\` returned by the previous call (along with the same
\`agentId\` if you used one). Server-side context is preserved — do NOT
replay prior messages. Only start a fresh conversation when the user
explicitly asks to clear context.
`;
