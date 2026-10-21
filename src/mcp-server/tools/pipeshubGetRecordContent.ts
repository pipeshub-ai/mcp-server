import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { connectorLookupRecordByIdentifier } from "../../funcs/connectorLookupRecordByIdentifier.js";
import { connectorNavigateKnowledgeGraph } from "../../funcs/connectorNavigateKnowledgeGraph.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  httpErrorResult,
  jsonResult,
  readJson,
} from "./_helpers.js";

/**
 * Navigate and lookup return a server-rendered `text` view alongside the
 * structured fields. It ends in a `Next:` line naming the exact follow-up call,
 * so hand the LLM that string; fall back to JSON if the field is missing.
 */
export async function renderedResult(response: Response) {
  const parsed = await readJson<{ text?: string }>(response);
  if (!parsed.ok) return parsed.result;
  const text = parsed.value?.text;
  return typeof text === "string" && text.trim().length > 0
    ? { content: [{ type: "text" as const, text }] }
    : jsonResult(parsed.value);
}

/** What a read returns by default: about 10k tokens, inside common clients'
 * tool-output limits (Claude Code's is 25k tokens). */
export const DEFAULT_MAX_CHARS = 40_000;

const args = {
  mode: z.enum(["content", "thread", "navigate", "lookup"]).default("content")
    .describe(
      "`content` (default) reads a record's text by `recordId`, in parts "
        + "when it is long. `thread` reads the whole Slack thread a message "
        + "belongs to. `lookup` resolves a URL / issue key / external ID to "
        + "a recordId. `navigate` browses the knowledge graph tree.",
    ),

  // mode: "content" | "thread"
  recordId: z.string().min(1).optional().describe(
    "Record identifier — usually a UUID for connector-sourced records or "
      + "a 24-character ObjectId for uploaded records. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit. "
      + "Required when `mode` is `content` or `thread`.",
  ),
  query: z.string().min(1).max(2000).optional().describe(
    "Content mode: what you are looking for in this record. When the record "
      + "is longer than `maxChars`, the passages most relevant to it come "
      + "back first, with the skipped block ranges marked. Ignored when "
      + "`startBlock` is given.",
  ),
  startBlock: z.int().min(0).optional().describe(
    "Read in order from this block — the value in a previous read's `Next:` "
      + "line, or 0 to read from the top. In thread mode it applies to the "
      + "record at `startRecord`.",
  ),
  startRecord: z.int().min(0).optional().describe(
    "Thread mode: carry on a long thread from this record, with the "
      + "`startBlock` given beside it in a previous read's `Next:` line.",
  ),
  maxChars: z.int().min(2000).max(140000).default(DEFAULT_MAX_CHARS).describe(
    "Content and thread modes: most characters of text to return. The "
      + "default (40000, about 10k tokens) fits common tool-output limits; "
      + "raise it only if your client accepts larger results.",
  ),

  // mode: "navigate"
  nodeId: z.string().min(1).max(2048).optional().describe(
    "The node to open. Take it from a `record_id=` or `node_id=` shown in a "
      + "previous navigate or lookup response, from a search hit's `recordId`, "
      + "or from a `pipeshub_sources` id — a KB or connector id opens that "
      + "source directly. Omit it entirely for the flat listing of everything "
      + "reachable, newest first — the usual starting point. A URL or an issue "
      + "key such as `PA-1787` also works: it is resolved to its record "
      + "automatically, so no separate lookup is needed.",
  ),
  page: z.int().min(1).default(1).describe("Page number, 1-indexed."),
  limit: z.int().min(50).max(200).default(50).describe(
    "Children per page. The minimum is 50 — smaller values are rejected "
      + "rather than silently raised.",
  ),
  depth: z.int().min(1).max(3).default(1).describe(
    "Levels of descendants to return in one call. Above 1, the listing is a "
      + "flat list of all descendants down to that level rather than only "
      + "direct children, and each row carries its own `level`.",
  ),
  nodeTypes: z.array(z.string()).optional().describe(
    "Restrict children to these node types, e.g. `[\"record\", \"folder\"]`.",
  ),
  createdAfter: z.string().optional().describe(
    "Filter children by source creation time. ISO 8601 `YYYY-MM-DD`, or a "
      + "full datetime that MUST carry a timezone offset — a naive datetime is "
      + "rejected rather than assumed to be UTC.",
  ),
  createdBefore: z.string().optional().describe(
    "Filter children by source creation time. `YYYY-MM-DD` is inclusive of "
      + "the whole day.",
  ),
  modifiedAfter: z.string().optional().describe(
    "Filter children by source modification time. Same formats as "
      + "`createdAfter`.",
  ),
  modifiedBefore: z.string().optional().describe(
    "Filter children by source modification time. Same formats as "
      + "`createdBefore`.",
  ),

  // mode: "lookup"
  identifiers: z.union([
    z.string().min(1).max(2048),
    z.array(z.string().min(1).max(2048)).min(1).max(10),
  ]).optional().describe(
    "The reference(s) to resolve: a URL, an issue key such as `PA-1787`, or "
      + "a bare external system ID. Paste each exactly as you found it — "
      + "tracking parameters and fragments are handled. Pass a single string, "
      + "or an array of up to 10 to resolve them in one call. Required when "
      + "`mode` is `lookup`.",
  ),
  connectorName: z.string().optional().describe(
    "Optional hint that prioritises resolution order, e.g. `JIRA`, "
      + "`CONFLUENCE`, `GOOGLE_DRIVE`, `SLACK`. It cannot widen the search beyond the "
      + "connectors you can already access. Useful on a retry when a lookup "
      + "came back empty.",
  ),
};

export const tool$pipeshubGetRecordContent: ToolDefinition<typeof args> = {
  name: "pipeshub_get_record_content",
  description:
    `Four operations on the org's records. Pick by what you hold:

  \`mode:"lookup"\`   — a URL, issue key (PA-1787), or external ID
                    → its recordId plus the record's metadata
  \`mode:"navigate"\` — a question about structure: what is under X,
                    what links to Y → browses the hierarchy
  \`mode:"content"\`  — a recordId, and you need that record's text
  \`mode:"thread"\`   — a Slack message whose whole thread you need

**\`mode:"content"\` (default)** — the only way to read one record's full
text. Use it whenever missing part of the document could make the answer
wrong: summarize, extract or list ALL of something, check whether or where
a doc mentions X, review, or compare named docs. \`pipeshub_chat\` cannot do
these — it never sees a whole document.

Judge by the user's INTENT, not their keywords: "what's this doc about?",
"walk me through the report", "anything in here about Y?" are all
full-content tasks. Get the \`recordId\` from a \`pipeshub_search\` top hit, a
chat citation, or \`mode:"lookup"\`.

Returns a metadata header then the parsed text, up to \`maxChars\`. A long
record comes in parts, ending in a \`Next:\` line naming the next call.
GitHub PR records include diffs and can exceed your tool-output limit:
pass \`query\` to get relevant passages first.
\`No record found\` may mean it exists but is not indexed yet (newer
servers: a \`Not indexed:\` line). A missing id is a 403.

It returns one record, not always the whole conversation: a Slack record is
one burst of messages, thread replies are separate records, and "Reply
Count: N" means they are not in this text. \`mode:"thread"\` on any of
them reads the whole thread.

**\`mode:"navigate"\`** — browse the hierarchy: RecordGroup (project /
space / drive / folder) → Record (epic / story / page / file) → children,
with breadcrumbs, related links and record IDs.

Use it when the question depends on structure rather than wording: what is
under this epic, which pages sit in this space, what is linked to this
ticket, what is in this folder — and every "how many" / "all of" / "every"
question. Search ranks by content; only this shows how records relate, and
only this gives a count you can trust.

Omit \`nodeId\` for a flat listing of everything reachable, most recently
updated first — the usual starting point. A URL, an issue key, or a
\`pipeshub_sources\` id also works and resolves automatically.

Pass \`depth:2\` or \`depth:3\` to see several levels in ONE call — an epic's
stories AND their subtasks, a space's pages AND their children — instead of
one call per level. Use it whenever the question needs an overview of a
hierarchy rather than a single node.

Opening a record also prints that record's own metadata — for a ticket,
status, assignee, priority and dates — so a question about one record is
often answered by this call alone. It returns no document text; for that,
re-call with \`mode:"content"\`.

Returns \`Path\` breadcrumbs, the current node's metadata, a children listing
carrying \`record_id=\` or \`node_id=\` per row plus the group's total
(\`Children 1-50 of 61\`), \`Related\` cross-references, and a \`Next:\` line.
One page is usually every child, so only pass \`page:2\` when that \`Next:\`
line says more exist.

\`Related\` lists only links recorded inside a source (Jira issue links,
GitHub blocked-by), not Slack messages or pages that mention the record. To
find discussion of a PR or ticket, \`pipeshub_search\` for its number or URL
with the Slack connector id in \`apps\`.

**\`mode:"lookup"\`** — turn an external reference into a recordId, the first
step whenever the question names one. Returns that record's metadata (for a
ticket: status, assignee, priority, dates) plus its recordId, which
\`mode:"navigate"\` takes to list what is under it and \`mode:"content"\` takes
to read it.

Handles Jira keys and URLs, Confluence, Drive, Slack permalinks, Linear,
Notion, ServiceNow sys_id, SharePoint, Gmail/Outlook, and any connector
whose records index a web URL. Resolution searches ALL connectors you can
access, regardless of any source filter you used elsewhere.

A miss is a 200 with empty \`matches\` and the input echoed in
\`not_found_identifiers\` — that may mean no-access, not non-existence. Use
\`mode:"navigate"\` to confirm the record exists before telling the user it
does not. If \`ambiguous\` is true, pick from \`matches\` rather than taking
the first.

Navigate and lookup return a rendered text view whose closing \`Next:\` line
names the exact follow-up call — follow it. When presenting a record, link
it using the \`Web URL\` from its metadata header (when present).`,
  scopes: ["read"],
  annotations: {
    title: "Read, browse, or resolve records",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const fetchOptions = { fetchOptions: { signal: ctx.signal } };

    // Navigate / lookup return the rendered `text` view rather than the
    // `{ content: <string> }` envelope that content mode unwraps.
    if (args.mode === "navigate") {
      const [r] = await connectorNavigateKnowledgeGraph(client, {
        nodeId: args.nodeId,
        page: args.page,
        limit: args.limit,
        depth: args.depth,
        nodeTypes: args.nodeTypes,
        createdAfter: args.createdAfter,
        createdBefore: args.createdBefore,
        modifiedAfter: args.modifiedAfter,
        modifiedBefore: args.modifiedBefore,
      }, fetchOptions).$inspect();
      if (!r.ok) return errorResult(r.error.message);

      const httpErr = await httpErrorResult(r.value, "Navigate knowledge graph");
      if (httpErr) return httpErr;

      return renderedResult(r.value);
    }

    if (args.mode === "lookup") {
      const identifiers = typeof args.identifiers === "string"
        ? [args.identifiers]
        : args.identifiers ?? [];
      if (identifiers.length === 0) {
        return errorResult('`identifiers` is required when mode is "lookup".');
      }
      const [r] = await connectorLookupRecordByIdentifier(client, {
        identifiers,
        connectorName: args.connectorName,
      }, fetchOptions).$inspect();
      if (!r.ok) return errorResult(r.error.message);

      const httpErr = await httpErrorResult(r.value, "Record lookup");
      if (httpErr) return httpErr;

      return renderedResult(r.value);
    }

    if (!args.recordId) {
      return errorResult(
        `\`recordId\` is required when mode is "${args.mode}".`,
      );
    }
    const thread = args.mode === "thread";
    const [result] = await connectorGetRecordContent(client, {
      recordId: args.recordId,
      maxChars: args.maxChars,
      ...(thread
        ? {
          mode: "thread" as const,
          startRecord: args.startRecord,
          startBlock: args.startBlock,
        }
        : { query: args.query, startBlock: args.startBlock }),
    }, fetchOptions).$inspect();
    if (!result.ok) return errorResult(result.error.message);

    // The SDK func uses errorCodes:[], so any non-2xx comes back as an
    // ok=false Response — surface it as an error rather than parsing it.
    const httpErr = await httpErrorResult(
      result.value,
      thread ? "Read Slack thread" : "Get record content",
    );
    if (httpErr) return httpErr;

    // Success: the endpoint returns { content: <string>, ... }. Hand the LLM
    // the plain text (real newlines), not the JSON wrapper, and say how much
    // of the record that was and how to read on.
    const parsed = await readJson<RecordRead>(result.value);
    if (!parsed.ok) return parsed.result;
    return {
      content: [{
        type: "text",
        text: renderRead(parsed.value, args.recordId, thread),
      }],
    };
  },
};

/** The fields a budgeted read adds beside `content`. A server that predates
 * budgeted reads sends `content` alone. */
export type RecordRead = {
  content?: string;
  mode?: "record" | "thread";
  order?: "in_order" | "relevance";
  totalBlocks?: number;
  shownBlocks?: Array<[number, number]>;
  complete?: boolean;
  truncatedBy?: string | null;
  /** A block larger than the largest `maxChars` that this read cut and gave
   * up: no read can return the rest of it. */
  givenUpBlock?: number | null;
  givenUpBlocks?: Array<{ recordId?: string; block?: number }>;
  startBlock?: number;
  nextStartBlock?: number | null;
  chars?: number;
  threadRecordCount?: number;
  startRecord?: number;
  nextStartRecord?: number | null;
  records?: Array<{
    recordId?: string;
    complete?: boolean;
    truncatedBy?: string | null;
    givenUpBlock?: number | null;
    nextStartBlock?: number | null;
  }>;
  unreadableRecordIds?: string[];
};

const lost = (block: number | null | undefined, record?: string) =>
  `Lost: block ${block ?? "?"}${record ? ` of record ${record}` : ""} is larger `
  + "than any maxChars allows; it was cut and the rest of it cannot be returned.";

const call = (args: Record<string, unknown>) =>
  `pipeshub_get_record_content ${JSON.stringify(args)}`;

// The Slack connectors end a message that started a thread with this line.
// Its replies are separate records, so a read of this record does not hold
// them all, whatever its header says.
const REPLY_COUNT = /(?:^|\n)Reply Count: (\d+)[ \t]*(?=\n|$)/g;

/**
 * A line naming the thread read when the text shows messages with replies,
 * or nothing. Agents took "Read: the whole record" over a parent message as
 * the end of the conversation and never read the replies.
 */
function repliesLine(content: string, recordId: string): string[] {
  const counts = [...content.matchAll(REPLY_COUNT)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0);
  if (counts.length === 0) return [];
  const total = counts.reduce((a, b) => a + b, 0);
  const who = counts.length === 1
    ? "A message here has"
    : `${counts.length} messages here have`;
  return [
    `Replies: ${who} ${total} thread repl${total === 1 ? "y" : "ies"}, kept as `
      + "separate records. Read the whole thread: "
      + call({ mode: "thread", recordId }),
  ];
}

const ranges = (shown: Array<[number, number]> | undefined) =>
  (shown ?? []).map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");

/**
 * The text the model reads: the content, then a `Read:` line saying how much
 * of the record or thread that was and, when something is left, a `Next:`
 * line naming the exact call that reads on. The server's own hints inside
 * the content say the same in prose; this line is the one to follow.
 */
export function renderRead(
  read: RecordRead,
  recordId: string,
  thread: boolean,
): string {
  const content = read.content ?? "";
  if (thread && read.mode !== "thread") {
    // A server without thread reads ignores `mode` and returns the record.
    return "This PipesHub server cannot read a whole Slack thread (it needs "
      + "a newer PipesHub). Below is only the record you named; search for "
      + "words from the thread to find its replies.\n\n" + content;
  }
  if (read.mode === "thread") {
    const lines: string[] = [];
    const total = read.threadRecordCount ?? 0;
    const shown = read.records ?? [];
    const first = (read.startRecord ?? 0) + 1;
    // Given up in this read, whether or not the thread goes on. An older
    // server sends no `givenUpBlocks`; a record entry that was cut with
    // nowhere to resume is the same loss.
    const givenUp = read.givenUpBlocks
      ?? shown
        .filter((r) =>
          r.givenUpBlock != null
          || (r.truncatedBy === "clipped" && r.nextStartBlock == null)
        )
        .map((r) => ({ recordId: r.recordId, block: r.givenUpBlock ?? undefined }));
    // "The whole thread" only for a read that began at the start and lost
    // nothing; a later page cannot know what earlier pages lost.
    const fromStart = first === 1 && (read.startBlock ?? 0) === 0;
    lines.push(
      read.complete
        ? fromStart && givenUp.length === 0
          ? `Read: the whole thread (${total} record${total === 1 ? "" : "s"}).`
          : `Read: to the end of the thread (records ${first}–${total} of ${total}`
            + `${fromStart
              ? ""
              : (read.startBlock ?? 0) > 0
                ? `; blocks before ${read.startBlock} of record ${first} were in earlier reads`
                : "; earlier ones were in earlier reads"}).`
        : `Read: thread records ${first}–${first + shown.length - 1} of ${total}.`,
    );
    for (const g of givenUp) lines.push(lost(g.block, g.recordId));
    const unreadable = read.unreadableRecordIds ?? [];
    if (unreadable.length > 0) {
      lines.push(
        `${unreadable.length} record(s) of this thread could not be loaded, so `
          + `the conversation may have gaps: ${unreadable.join(", ")}.`,
      );
    }
    if (read.nextStartRecord != null) {
      // The cursor is a record and a block: it stays on a reply that was cut
      // short until that reply has been read to its end.
      lines.push(
        "Next: "
          + call({
            mode: "thread",
            recordId,
            startRecord: read.nextStartRecord,
            startBlock: read.nextStartBlock ?? 0,
          }),
      );
    }
    return `${content}\n\n${lines.join("\n")}`;
  }
  // A record with no content to read (`No record found`, or a `Not indexed:`
  // note) carries no block count. Saying it was read in full would tell the
  // model the record is empty, so its text goes through on its own.
  const replies = repliesLine(content, recordId);
  if (
    read.mode !== "record" || read.complete == null
    || typeof read.totalBlocks !== "number"
  ) {
    return replies.length ? `${content}\n\n${replies.join("\n")}` : content;
  }

  const total = read.totalBlocks;
  const start = read.startBlock ?? 0;
  // Given up in this read, even when more of the record follows. An older
  // server sends no `givenUpBlock`, only a complete read cut short.
  const givenUp = read.givenUpBlock != null
    || (read.complete === true && read.truncatedBy === "clipped");
  const lostLine = givenUp ? [lost(read.givenUpBlock)] : [];
  if (read.complete) {
    // "The whole record" only for a read that began at block 0 and lost
    // nothing; a continuation cannot know what earlier reads lost.
    const head = start === 0 && !givenUp
      ? `Read: the whole record (${total} block${total === 1 ? "" : "s"}).`
      : `Read: to the end of the record (${total} block${total === 1 ? "" : "s"}`
        + `${start === 0 ? "" : `; blocks before ${start} were in earlier reads`}).`;
    return `${content}\n\n${[head, ...lostLine, ...replies].join("\n")}`;
  }
  const lines = [
    read.order === "relevance"
      ? `Read: the blocks most relevant to your query (${ranges(read.shownBlocks)} of ${total}); the rest were skipped.`
      : `Read: blocks ${ranges(read.shownBlocks)} of ${total}.`,
    ...lostLine,
    ...replies,
  ];
  if (read.nextStartBlock != null) {
    lines.push(
      "Next: "
        + call({ mode: "content", recordId, startBlock: read.nextStartBlock }),
    );
  }
  if (read.order === "relevance") {
    lines.push(
      "To read it in order instead: "
        + call({ mode: "content", recordId, startBlock: 0 }),
    );
  }
  return `${content}\n\n${lines.join("\n")}`;
}
