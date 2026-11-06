import * as z from "zod";
import { recordCite, SHOW_CITATIONS_HINT } from "../cite.js";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { connectorLookupRecordByIdentifier } from "../../funcs/connectorLookupRecordByIdentifier.js";
import { connectorNavigateKnowledgeGraph } from "../../funcs/connectorNavigateKnowledgeGraph.js";
import { ONE_TRY_HEADER, REQUEST_TIMEOUT_HEADER } from "../../hooks/transport-defaults.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PipeshubCore } from "../../core.js";
import { ToolDefinition } from "../tools.js";
import {
  citedRecordShape,
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

/**
 * A navigate or lookup result with its text also as `structuredContent`.
 * The server's own fields are not passed on: their shape is not this
 * package's to promise.
 */
function asStructured(mode: "navigate" | "lookup", result: CallToolResult): CallToolResult {
  if (result.isError) return result;
  const text = result.content.map((c) => c.type === "text" ? c.text : "").join("");
  return { ...result, structuredContent: { mode, text } };
}

/**
 * The value of one `Name: value` line of the metadata header a read starts
 * with; the header ends at the first blank line.
 */
export function headerField(content: string, name: string): string | undefined {
  const header = content.split("\n\n")[0] ?? "";
  return new RegExp(`^${name}: (.+)$`, "m").exec(header)?.[1]?.trim();
}

/** A read's citation fields and progress, beside its unchanged text. */
function readStructured(read: RecordRead, recordId: string, thread: boolean, text: string) {
  const content = typeof read?.content === "string" ? read.content : "";
  const field = (name: string) => thread ? undefined : headerField(content, name);
  const webUrl = field("Web URL");
  const updatedAt = field("Last Updated At") ?? field("Last Updated") ?? field("File Last Modified");
  const pick = <T>(v: T | null | undefined) => v ?? undefined;
  return Object.fromEntries(Object.entries({
    mode: thread ? "thread" : "content",
    recordId,
    recordName: field("Name"),
    webUrl: webUrl && /^https?:\/\//.test(webUrl) ? webUrl : undefined,
    connector: field("Connector"),
    updatedAt,
    complete: pick(read?.complete),
    totalBlocks: pick(read?.totalBlocks),
    nextStartBlock: pick(read?.nextStartBlock),
    nextStartRecord: pick(read?.nextStartRecord),
    text,
  }).filter(([, v]) => v !== undefined));
}

const outputSchema = {
  mode: z.enum(["content", "thread", "navigate", "lookup"]).optional(),
  ...citedRecordShape,
  complete: z.boolean().optional(),
  totalBlocks: z.number().optional(),
  nextStartBlock: z.number().optional(),
  nextStartRecord: z.number().optional(),
  text: z.string().optional().describe("The same text as the content block."),
};

/** What a read returns by default: about 10k tokens, inside common clients'
 * tool-output limits (Claude Code's is 25k tokens). */
export const DEFAULT_MAX_CHARS = 40_000;

/**
 * How long an extract may take to start answering: the server reads the
 * record, gives its reader model up to 60 s, and reads the record again if
 * the model fails. Tried once: a repeat would run the model again.
 */
export const EXTRACT_TIMEOUT_MS = 150_000;

// The record tools. Each does one of what `pipeshub_get_record_content`
// did by `mode`, so its schema holds only the arguments that apply and
// marks the ones it needs as required.

export const READ_RECORD = "pipeshub_read_record";
export const READ_THREAD = "pipeshub_read_thread";
export const BROWSE = "pipeshub_browse";
export const RESOLVE_REFERENCE = "pipeshub_resolve_reference";

const recordId = z.string().min(1).describe(
  "Record identifier — usually a UUID for connector-sourced records or "
    + "a 24-character ObjectId for uploaded records. Get it from a chat "
    + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
);
const maxChars = z.int().min(2000).max(140000).default(DEFAULT_MAX_CHARS).describe(
  "Most characters of text to return, 2000 to 140000. The default (40000, "
    + "about 10k tokens) fits common tool-output limits; raise it only if "
    + "your client accepts larger results.",
);

const readArgs = {
  recordId,
  query: z.string().min(1).max(2000).optional().describe(
    "What you are looking for in this record. When the record is longer "
      + "than `maxChars`, the passages most relevant to it come back first, "
      + "with the skipped block ranges marked. Ignored when `startBlock` is "
      + "given.",
  ),
  startBlock: z.int().min(0).optional().describe(
    "Read in order from this block — the value in a previous read's `Next:` "
      + "line, or 0 to read from the top.",
  ),
  extract: z.boolean().optional().describe(
    "With `query`: return only the passages that answer `query`, copied "
      + "word for word by PipesHub's reader model, instead of the record's "
      + "text: far shorter than a read. Use it to pull facts out of a record. "
      + "Read without it to list or count everything in a record, or when the "
      + "extract lacks what you need.",
  ),
  maxChars,
};

const threadArgs = {
  recordId: recordId.describe(
    "The `recordId` of any message in the thread. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
  ),
  startRecord: z.int().min(0).optional().describe(
    "Carry on a long thread from this record, with the `startBlock` given "
      + "beside it in a previous read's `Next:` line.",
  ),
  startBlock: z.int().min(0).optional().describe(
    "With `startRecord`: the block of that record to read on from, as the "
      + "previous read's `Next:` line gives it.",
  ),
  maxChars,
};

const browseArgs = {
  nodeId: z.string().min(1).max(2048).optional().describe(
    "The node to open: a `record_id=` or `node_id=` from a previous listing, "
      + "a search hit's `recordId`, or a `pipeshub_sources` id, which opens "
      + "that source. A URL or an issue key such as `PA-1787` also works. "
      + "Omit it for the flat listing of everything reachable, newest first.",
  ),
  page: z.int().min(1).default(1).describe("Page number, 1-indexed."),
  limit: z.int().min(50).max(200).default(50).describe(
    "Children per page, 50 to 200. A smaller value is rejected rather than "
      + "raised.",
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
    "Only children created in their source on or after this: `YYYY-MM-DD`, "
      + "or an ISO 8601 datetime with a timezone offset (one without is rejected).",
  ),
  createdBefore: z.string().optional().describe(
    "Only children created on or before this; `YYYY-MM-DD` includes the whole day.",
  ),
  modifiedAfter: z.string().optional().describe(
    "As `createdAfter`, for when the record last changed in its source.",
  ),
  modifiedBefore: z.string().optional().describe(
    "As `createdBefore`, for when the record last changed in its source.",
  ),
};

/** Browse and resolve hand on the server's rendered text, not its fields. */
const listingOutputSchema = {
  mode: z.enum(["navigate", "lookup"]).optional(),
  text: z.string().optional().describe("The same text as the content block."),
};

const resolveArgs = {
  identifiers: z.union([
    z.string().min(1).max(2048),
    z.array(z.string().min(1).max(2048)).min(1).max(10),
  ]).describe(
    "The reference(s) to resolve: a URL, an issue key such as `PA-1787`, or "
      + "a bare external system ID. Paste each exactly as you found it — "
      + "tracking parameters and fragments are handled. Pass a single string, "
      + "or an array of up to 10 to resolve them in one call.",
  ),
  connectorName: z.string().optional().describe(
    "Optional hint that prioritises resolution order, e.g. `JIRA`, "
      + "`CONFLUENCE`, `GOOGLE_DRIVE`, `SLACK`. It cannot widen the search beyond the "
      + "connectors you can already access. Useful on a retry when a lookup "
      + "came back empty.",
  ),
};

type Shape<A> = { [K in keyof A]: A[K] extends z.ZodType ? z.output<A[K]> : never };

const readOnly = (title: string) => ({
  title,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  readOnlyHint: true,
});

// The server's listings name its own agent tools in their `Next:` lines.
const NEXT_MAP = "In a `Next:` line, `navigate(node_id=…)` means `pipeshub_browse` "
  + "with that `nodeId`, and `knowledgegraph__fetch_record(record_ids=[…])` means "
  + "`pipeshub_read_record`, once per id.";

async function browse(client: PipeshubCore, args: Shape<typeof browseArgs>, signal: AbortSignal) {
  const [r] = await connectorNavigateKnowledgeGraph(client, args, { fetchOptions: { signal } }).$inspect();
  if (!r.ok) return errorResult(r.error.message);
  const httpErr = await httpErrorResult(r.value, "Navigate knowledge graph");
  if (httpErr) return httpErr;
  return asStructured("navigate", await renderedResult(r.value));
}

async function resolve(client: PipeshubCore, args: Shape<typeof resolveArgs>, signal: AbortSignal) {
  const identifiers = typeof args.identifiers === "string" ? [args.identifiers] : args.identifiers;
  const [r] = await connectorLookupRecordByIdentifier(client, {
    identifiers,
    connectorName: args.connectorName,
  }, { fetchOptions: { signal } }).$inspect();
  if (!r.ok) return errorResult(r.error.message);
  const httpErr = await httpErrorResult(r.value, "Record lookup");
  if (httpErr) return httpErr;
  return asStructured("lookup", await renderedResult(r.value));
}

async function read(
  client: PipeshubCore,
  args: Partial<Shape<typeof readArgs> & Shape<typeof threadArgs>> & { recordId: string; maxChars: number },
  thread: boolean,
  signal: AbortSignal,
): Promise<CallToolResult> {
  const fetchOptions = { fetchOptions: { signal } };
  const extract = !thread && !!args.extract && !!args.query && args.startBlock === undefined;
  const [result] = await connectorGetRecordContent(client, {
    recordId: args.recordId,
    maxChars: args.maxChars,
    ...(thread
      ? {
        mode: "thread" as const,
        startRecord: args.startRecord,
        startBlock: args.startBlock,
      }
      : {
        query: args.query,
        startBlock: args.startBlock,
        ...(extract ? { extract: true } : {}),
      }),
  }, extract
    ? {
      ...fetchOptions,
      headers: {
        [REQUEST_TIMEOUT_HEADER]: String(EXTRACT_TIMEOUT_MS),
        [ONE_TRY_HEADER]: "1",
      },
    }
    : fetchOptions).$inspect();
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
  // A thread read joins several records' messages, so no one record's
  // cite stands for it; their search passages carry their own.
  const text = thread
    ? renderRead(parsed.value, args.recordId, thread)
    : withRecordCite(
      renderRead(parsed.value, args.recordId, thread),
      parsed.value?.content,
      args.recordId,
    );
  return {
    content: [{ type: "text", text }],
    structuredContent: readStructured(parsed.value, args.recordId, thread, text),
  };
}

export const tool$pipeshubReadRecord: ToolDefinition<typeof readArgs> = {
  name: READ_RECORD,
  description:
    `Read one record's text by \`recordId\`, in parts when it is long. Use it
on the records that matter after \`pipeshub_search\`, a chat citation, or
\`pipeshub_resolve_reference\`.

It is the only way to see a whole document. Use it whenever missing part of
one could make the answer wrong: summarize, list or count ALL of something,
check whether or where a doc mentions X, review, or compare named docs.
\`pipeshub_chat\` cannot do these — it never sees a whole document. Judge by
intent: "what's this doc about?", "walk me through the report" and
"anything in here about Y?" all need a read.

Returns a metadata header, then the text, up to \`maxChars\`. Its \`Read:\`
line says how much of the record that was; a \`Next:\` line names the call
that reads on. Pass \`query\` to get the most relevant passages of a long
record first (GitHub PR records include diffs and can exceed your
tool-output limit); add \`extract\` for only the passages that answer it.

\`No record found\` may mean it exists but is not indexed yet (newer servers:
a \`Not indexed:\` line). A missing id is a 403. A Slack record is one burst of messages:
"Reply Count: N" means its replies are separate records, which
\`pipeshub_read_thread\` reads. Link a record with the \`Web URL\` from its
header.`,
  scopes: ["read"],
  annotations: readOnly("Read a record"),
  args: readArgs,
  outputSchema,
  tool: (client, args, ctx) => read(client, args, false, ctx.signal),
};

export const tool$pipeshubReadThread: ToolDefinition<typeof threadArgs> = {
  name: READ_THREAD,
  description:
    `Read the whole Slack thread a message belongs to, from the \`recordId\` of
any message in it. Slack keeps each reply as its own record, so a read of
one message shows only part of a conversation: use this when a read shows
"Reply Count: N", or the question is about a discussion.

Returns the thread's messages in order and a \`Read:\` line; a long thread
ends in a \`Next:\` line naming the call that reads on. Records of the
thread that could not be loaded are listed: say the conversation may have
gaps. A record outside a Slack thread is refused: read it with
\`pipeshub_read_record\`. An older PipesHub server returns only the message
named, and says so.`,
  scopes: ["read"],
  annotations: readOnly("Read a Slack thread"),
  args: threadArgs,
  outputSchema,
  tool: (client, args, ctx) => read(client, args, true, ctx.signal),
};

export const tool$pipeshubBrowse: ToolDefinition<typeof browseArgs> = {
  name: BROWSE,
  description:
    `List what is under a source, space, project, folder or record, with real
totals: the tool for structure and for every "how many", "all of" or
"every" question. Search ranks by wording and returns a sample; only this
shows how records relate and gives a count you can trust.

Omit \`nodeId\` for a flat listing of everything you can reach, most
recently updated first: the usual start. \`depth: 2\` or \`3\` lists several
levels in one call, such as an epic's stories and their subtasks.

Returns \`Path\` breadcrumbs; the node's own metadata (for a ticket: status,
assignee, priority, dates, so one call often answers a question about one
record); its children, with \`record_id=\` or \`node_id=\` per row and the
total (\`Children 1-50 of 61\`); and \`Related\` links. No document text: read
that with \`pipeshub_read_record\`. Pass \`page: 2\` only when the \`Next:\`
line says more exist. Date filters narrow the children; they do not promise
every record changed in that span.

\`Related\` lists only links recorded inside a source (Jira issue links,
GitHub blocked-by), not Slack messages or pages that mention the record.
To find those, \`pipeshub_search\` for its number or URL: with the Slack
connector id in \`apps\` for Slack discussion, without \`apps\` for pages.

${NEXT_MAP}`,
  scopes: ["read"],
  annotations: readOnly("Browse records"),
  args: browseArgs,
  outputSchema: listingOutputSchema,
  tool: (client, args, ctx) => browse(client, args, ctx.signal),
};

export const tool$pipeshubResolveReference: ToolDefinition<typeof resolveArgs> = {
  name: RESOLVE_REFERENCE,
  description:
    `Turn a link, issue key (PA-1787) or external ID into its record: the
first step whenever the user names one. Returns the \`recordId\` and the
record's metadata (for a ticket: status, assignee, priority, dates).
\`pipeshub_browse\` takes that id to list what is under it, and
\`pipeshub_read_record\` to read it.

Handles Jira, Confluence, Drive, Slack permalinks, Linear, Notion,
ServiceNow sys_id, SharePoint, Gmail/Outlook, and any connector whose
records index a web URL, across every connector you can access.

The indexing status shown here can be wrong: read the record before saying
its text is unavailable. A miss echoes the input in
\`not_found_identifiers\`; that may mean no access, not that it does not
exist, so check with \`pipeshub_browse\` before telling the user it does not.
If \`ambiguous\` is true, pick from \`matches\` rather than taking the first.

${NEXT_MAP}`,
  scopes: ["read"],
  annotations: readOnly("Find a record by link or key"),
  args: resolveArgs,
  outputSchema: listingOutputSchema,
  tool: (client, args, ctx) => resolve(client, args, ctx.signal),
};

// The tool before it was split, by its old name. It is not listed
// (server.ts), so no model picks it, but callers that name it still work:
// installed `pipeshub` CLIs and QM bundles call it on a server they do not
// upgrade with.
const legacyArgs = {
  mode: z.enum(["content", "thread", "navigate", "lookup"]).default("content"),
  ...browseArgs,
  ...readArgs,
  ...threadArgs,
  recordId: recordId.optional(),
  identifiers: resolveArgs.identifiers.optional(),
  connectorName: resolveArgs.connectorName,
};

export const tool$pipeshubGetRecordContent: ToolDefinition<typeof legacyArgs> = {
  name: "pipeshub_get_record_content",
  description: `Unlisted. The record tools by their old name: \`mode\` content is
\`${READ_RECORD}\`, thread \`${READ_THREAD}\`, navigate \`${BROWSE}\`, lookup
\`${RESOLVE_REFERENCE}\`.`,
  scopes: ["read"],
  annotations: readOnly("Read, browse, or resolve records"),
  args: legacyArgs,
  outputSchema,
  tool: async (client, args, ctx) => {
    if (args.mode === "navigate") return browse(client, args, ctx.signal);
    if (args.mode === "lookup") {
      if (!args.identifiers) return errorResult('`identifiers` is required when mode is "lookup".');
      return resolve(client, { ...args, identifiers: args.identifiers }, ctx.signal);
    }
    if (!args.recordId) return errorResult(`\`recordId\` is required when mode is "${args.mode}".`);
    return read(client, { ...args, recordId: args.recordId }, args.mode === "thread", ctx.signal);
  },
};

/**
 * A read's text with the record's cite and the reminder to show citations,
 * so an answer that rests on a whole record can still point at it. A record
 * with nothing to read (not found, not indexed yet) has nothing to cite.
 */
export function withRecordCite(text: string, content: unknown, recordId: string): string {
  const body = typeof content === "string" ? content : "";
  if (!body.trim() || /(^|\n)(No record found|Not indexed:)/.test(body)) return text;
  return `${text}\nCite: ${recordCite(recordId)} (this record; a search passage's own cite marks the passage). `
    + SHOW_CITATIONS_HINT;
}

/** The fields a budgeted read adds beside `content`. A server that predates
 * budgeted reads sends `content` alone. */
export type RecordRead = {
  content?: string;
  mode?: "record" | "thread";
  order?: "in_order" | "relevance" | "extract";
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
  /** An extract's reader call; `error` alone when it failed and this is a plain read. */
  extract?: {
    model?: string;
    nothingRelevant?: boolean;
    truncated?: boolean;
    unverifiedLines?: number;
    sourceChars?: number;
    sourceComplete?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
  };
};

const lost = (block: number | null | undefined, record?: string) =>
  `Lost: block ${block ?? "?"}${record ? ` of record ${record}` : ""} is larger `
  + "than any maxChars allows; it was cut and the rest of it cannot be returned.";

const call = ({ mode, ...args }: { mode: "content" | "thread" } & Record<string, unknown>) =>
  `${mode === "thread" ? READ_THREAD : READ_RECORD} ${JSON.stringify(args)}`;

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

function withoutExtract(read: RecordRead): RecordRead {
  const { extract: _extract, ...plain } = read;
  return plain;
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
  if (read.order === "extract") {
    const x = read.extract ?? {};
    const from = x.sourceComplete
      ? "the whole record"
      : "the parts of the record most relevant to your query";
    const reader = `Reader: ${x.model ?? "model"}, ${x.inputTokens ?? 0} tokens in, `
      + `${x.outputTokens ?? 0} out.`;
    const fullRead = "To read the record itself: "
      + call({ mode: "content", recordId, startBlock: 0 });
    if (x.nothingRelevant) {
      // The reply is the reader's own words, not text from the record.
      return `Read: PipesHub's reader model found nothing in ${from} that `
        + "answers your query. That is the reader's judgement, not text from "
        + `the record. ${reader}\n${fullRead}`;
    }
    const notes = [
      ...(x.truncated ? ["The reader's reply was cut to fit, so later passages may be missing."] : []),
      ...(x.unverifiedLines
        ? [`${x.unverifiedLines} line(s) above are not in the record word for word: `
          + "treat them as the reader's paraphrase and check them in the record itself."]
        : []),
    ];
    return `${content}\n\n`
      + `Read: passages copied out for your query by PipesHub's reader model `
      + `from ${from}${x.sourceChars ? ` (${x.sourceChars} characters)` : ""}; `
      + "the rest of the record is not shown. The reader may add a note in "
      + "square brackets saying where a passage sits; such a note is not a "
      + `quote. ${reader}\n`
      + notes.map((n) => `${n}\n`).join("")
      + fullRead;
  }
  if (read.extract?.error) {
    return "PipesHub's reader model could not be reached, so this is a plain "
      + "read of the record.\n\n"
      + renderRead(withoutExtract(read), recordId, thread);
  }
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
