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
/**
 * The step that asks for the citations card. A client that shows no MCP Apps
 * views is sent the instructions without it (server.ts).
 */
export const SHOW_CITATIONS_STEP = `4. Before writing the answer, call \`pipeshub_show_citations\` once with
   the \`cite\` and \`quote\` of each passage it will rely on; then answer.
`;

export function pipeshubInstructions({ chat }: InstructionOptions): string {
  const orChat = chat ? " or trust a chat answer" : "";
  return `PipesHub searches the user's company Slack, Drive, Jira, Confluence, Gmail
and 50+ other sources with their own permissions, and returns answers that
link to the source. Use it for any question about company docs, tickets,
chats or people.

## Default: search, then read

For anything the user's data could answer, do NOT answer from your own
knowledge:

1. \`pipeshub_search\` (try other wording if it misses): one entry per
   record with up to 3 passages, a sample, never a complete list.
2. \`pipeshub_get_record_content\` on the records that matter (\`recordId\`).
3. Before answering, list the parts of the question and confirm each is
   answered from what you read. For "all", "every" or "how many", do not
   stop at the first matches.
${SHOW_CITATIONS_STEP}
A named record (issue key, link, external ID) starts with \`mode:"lookup"\`,
and "how many / all / every" with \`mode:"navigate"\`: do NOT count search
hits${orChat}: navigate the record group, which reports the real total. Never
guess a \`recordId\`; follow the \`Next:\` line navigate and lookup end with.

Over a span of time, \`pipeshub_search\` with \`timeline\`, and set the date
filters to that span, widened past its end. On a plain search, date filters
match when a record was written, not when an event happened. For "has this changed?", search for both the
current state and the earlier one.

Read the record whole (\`mode:"content"\`) to summarize, list all of
something, check whether it mentions something, rewrite or compare. Slack
replies are separate records ("Reply Count: N"; \`mode:"thread"\` reads the
thread). A long record would exceed your tool-output limit, so it comes in
parts: pass \`query\`, or follow \`Next:\`. \`Related\` omits Slack messages and
pages that only mention a record. To find Slack discussion of a PR or ticket,
search its number or URL with the Slack connector in \`apps\`; for pages,
search without \`apps\`, across every source.

## Say only what you read

- Something missing: search its exact name, number or version, then say
  "not found in what I searched". Say a record does not mention it only
  when its \`Read:\` line says the whole record or thread was shown and the
  result reports no gap: no \`Lost:\` block, unread replies, records not
  loaded or threads not read. An extract is not a whole read. Navigate
  shows which records exist, not what they say.
- A read ending in \`Next:\` is unfinished: read on. Never finish a passage
  cut off with "…".
- Current state: the later decision by the date its own text gives, not
  by when a record was last changed. Take a vote's outcome from its result.
- Every number, date, name or cause must come from a record you cite.
  \`Summary\` and \`Topics\` lines are written by PipesHub's model: confirm
  in the record's own text.
${chat ? CHAT_SECTION : ""}`;
}

const CHAT_SECTION = `
## \`pipeshub_chat\` is optional

It runs PipesHub's assistant over a few passages; your own search and
read is as accurate, so a client may leave chat out. Use it only when you
cannot run that loop, when the user asks for PipesHub's answer, to run an
org agent (\`agentId\` from \`pipeshub_agents\`), or for an action the user
asked for. Its answer: treat it as a lead and confirm IDs, statuses and dates in
the cited record. "Not found" means not in what it read. Actions are on
unless an admin has turned them off. Ask it questions, and never ask it to
write unless the user asked for that action.
`;

export const PIPESHUB_INSTRUCTIONS = pipeshubInstructions({ chat: true });
