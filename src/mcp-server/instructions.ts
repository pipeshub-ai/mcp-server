// Shared routing guidance for the host LLM. Surfaced two ways:
//   1. As the server `instructions` (always present at `initialize`).
//   2. As the body of the user-invokable `pipeshub-assistant` prompt.
// Keeping it in one place avoids the two copies drifting apart.

export interface InstructionOptions {
  /** Whether \`pipeshub_chat\` and \`pipeshub_agents\` are mounted. */
  chat: boolean;
}

/**
 * The guidance for a server with or without chat. Without it, every section
 * that names \`pipeshub_chat\` or \`pipeshub_agents\` is left out, so the
 * text never points at a tool the host cannot see.
 */
export function pipeshubInstructions({ chat }: InstructionOptions): string {
  const contentTools = chat
    ? "\`pipeshub_search\` / \`pipeshub_chat\`"
    : "\`pipeshub_search\`";
  const orChat = chat ? " or trust a\nchat answer" : "";
  return `# PipesHub MCP — instructions for the LLM

PipesHub is the user's workplace AI platform. It indexes their documents,
knowledge base content, and connector sources (Drive, Box, Confluence,
Slack, Jira, Gmail, ...). When in doubt, the answer is in PipesHub.

## Default: search, then read

For any question the user's PipesHub-indexed data could answer — company
policies, processes, decisions, history, who said what, "what do we know
about X", anything naming PipesHub or a connected source (Drive / Box /
Confluence / Slack / Gmail / Jira / ...) — do NOT answer from your own
knowledge. Retrieve and read it yourself:

1. \`pipeshub_search\` for the topic, names, or phrases. Try other wording,
   or narrow with \`apps\` / \`kb\`, when the first results miss.
2. \`pipeshub_get_record_content\` on the records that matter (the hit's
   \`recordId\`), and answer from what they say. Search passages are a
   sample of a record, not all of it.
3. Before answering, list the parts of the question and confirm each is
   answered from what you read. For "all", "every" or "how many", do not
   stop at the first matches.
4. Before writing the answer, call \`pipeshub_show_citations\` once with
   the \`cite\` of each passage it will rely on; then write the full answer.

A named record (issue key, link, external ID) starts with \`mode:"lookup"\`
instead, and "how many / all / every" with \`mode:"navigate"\` (below).

A question over a span of time (how X evolved, what changed between dates,
a summary over months) → \`pipeshub_search\` with \`timeline\`, and set the
date filters to that span, widened past its end to take in write-ups made
later. On a plain search, date filters match when a record was written or
changed, not when an event happened, so leave them off unless that is the
question. For "has this changed?", search for both the current state and
the earlier one.

Read the record whole whenever missing part of it could make the answer
wrong:

- Summarize / TL;DR / key points / takeaways / action items of a doc.
- Extract or list ALL of something (dates, owners, requirements, ...).
- Check whether / where a doc mentions something.
- Translate, rewrite, outline, review, or reformat a doc.
- Compare named docs (fetch each \`recordId\`).

That returns one record, which is not always the whole conversation: Slack
thread replies are separate records ("Reply Count: N" means they are not in
the text; \`mode:"thread"\` reads the whole thread). A long record, such as
a GitHub PR with its diffs, would exceed your tool-output limit, so it comes
back in parts: pass \`query\` to get the passages that matter first, or
follow the closing \`Next:\` line to read on.

${chat ? CHAT_SECTION : ""}## Other tools

- \`pipeshub_download_record\` — when the user wants the file as stored
  (download, attach, open). Never to read or summarize — that is
  \`pipeshub_get_record_content\` \`mode:"content"\`, which returns
  parsed text with a metadata header. \`convertTo\` is only
  \`application/pdf\`.
- \`pipeshub_directory\` — people, groups, teams, and \`whoami\` lookups.
  Not for documents or files — that is \`pipeshub_search\`.
- \`pipeshub_sources\` — call once at the start of a session to discover
  which connectors / KB / models are available, then cache the result.
${chat ? AGENTS_BULLET : ""}
## Knowledge Sources

A source (an app connector or a KB) holds record groups (a project, space,
drive, folder), which hold records (one ticket, page, file). Records nest —
an epic over its stories, a page over its child pages.

**Every tool returns metadata or content.**

- ${contentTools} — content, but only a ranked sample of
  passages: never every record that matches, never a complete list of what
  exists. Search returns one entry per record with up to 3 passages; read a
  record whole with \`mode:"content"\`.
- \`mode:"lookup"\` and \`mode:"navigate"\` — metadata: recordIds, fields, and
  structure. No document text. \`mode:"content"\` — one record's text, in
  parts; \`mode:"thread"\` — a whole Slack thread.

**Combining them.** Search finds a starting point by wording; navigate on a
\`recordId\` reveals what search structurally cannot — siblings, children,
in-source links (\`Related\`), and the group's total count. \`Related\` omits
Slack messages and pages that only mention a record. To find Slack discussion
of a PR or ticket, search for its number or URL with the Slack connector id in
\`apps\`; to find a page that mentions it, run the same search without \`apps\`,
across every source. For a question that must be
exhaustive ("all", "how many", "every"), do NOT count search hits${orChat}:
navigate the record group, which reports the real total. For a
record's siblings, navigate its parent — take the id from the \`Path\` line.

**A named record** — an issue key, a Confluence / Drive / Slack link, an
external ID → \`mode:"lookup"\` FIRST. It returns that record's metadata (for a
ticket: status, assignee, priority, dates) plus its \`recordId\`, which often
answers the question outright. Never guess a \`recordId\`.

For search, pass a connector id from \`pipeshub_sources\` as \`apps: ["<id>"]\`
and a collection id (\`kind: "knowledgeBase"\`) as \`kb: ["<id>"]\`. Any source
id works as \`nodeId\` to navigate. Navigate and lookup end in a \`Next:\` line
naming the exact follow-up call — follow it.

${chat ? AGENTS_SECTIONS : ""}`;
}

const CHAT_SECTION = `## \`pipeshub_chat\` is optional

\`pipeshub_chat\` runs PipesHub's own assistant over a few passages it
retrieves itself. An agent that searches and reads for itself is as
accurate, with fewer wrong claims, at lower cost and latency, so a client
may leave chat out. Use it only when you cannot run your own search-and-read
loop, when the user asks for PipesHub's answer, to run an org agent, or to
take an action the user asked for through their connected tools.
Do NOT call it to cross-check, fill gaps in, or summarize what you searched
and read: it reads less than you did. Search again with other wording.

Its answer is a synthesis of a few passages, never a whole document, so
treat it as a lead: confirm a specific ID, status, date, owner, or "merged /
shipped" in the cited record before stating it. "Not found" means not in
what it read, not that it does not exist.

It can also take actions through the user's connected tools (for example
create a ticket or send an email). Actions are on unless an admin has
turned them off. Ask it questions, and never ask it to write unless the
user asked for that action.

`;

const AGENTS_BULLET = `- \`pipeshub_agents\` — list the org's configured **agents** (specialized
  assistants with their own prompt, tools, and knowledge scope).
`;

const AGENTS_SECTIONS = `## Agents

Some orgs configure **agents** for specific jobs (e.g. a Slack messenger, a
Jira ticket creator, a Salesforce CRM updater). To run a turn against an
agent, call \`pipeshub_chat\` with its \`agentId\` (from \`pipeshub_agents\`).

- The user names a system/action that maps to an agent (e.g. "post to
  Slack", "create a Jira ticket", "update the Salesforce deal") → call
  \`pipeshub_agents\`, pick the matching agent, and use it.
- A plain question about the org's knowledge → search and read, above.

**If you are unsure which agent fits the request**, call
\`pipeshub_agents\` FIRST and read the returned names/descriptions, then
either pick the best match or present the list to the user and let them
choose. Do NOT guess an agent blindly, and do NOT refuse — list the agents
and decide from real data. The list may be empty (no agents configured).
When no agent fits an action the user asked for, call \`pipeshub_chat\`
without an \`agentId\`: plain chat can use the user's connected tools.

## Conversation lifecycle

\`pipeshub_chat\` starts and continues conversations (plain or with an
\`agentId\`). On the first turn omit \`conversationId\`; on every later
turn pass back the \`conversationId\` it returned (with the same
\`agentId\` if you used one). Server-side context is preserved — do NOT
replay prior messages. Start a fresh conversation only when the user
explicitly asks to clear context.
`;

export const PIPESHUB_INSTRUCTIONS = pipeshubInstructions({ chat: true });
