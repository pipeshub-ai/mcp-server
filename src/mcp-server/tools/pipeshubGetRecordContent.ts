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

const args = {
  mode: z.enum(["content", "navigate", "lookup"]).default("content").describe(
    "`content` (default) reads a record's full text by `recordId`. "
      + "`lookup` resolves a URL / issue key / external ID to a recordId. "
      + "`navigate` browses the knowledge graph tree.",
  ),

  // mode: "content"
  recordId: z.string().min(1).optional().describe(
    "Record identifier — usually a UUID for connector-sourced records or "
      + "a 24-character ObjectId for uploaded records. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit. "
      + "Required when `mode` is `content`.",
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
    `Three operations on the org's records. Pick by what you hold:

  \`mode:"lookup"\`   — a URL, issue key (PA-1787), or external ID
                    → its recordId plus the record's metadata
  \`mode:"navigate"\` — a question about structure: what is under X,
                    what links to Y → browses the hierarchy
  \`mode:"content"\`  — a recordId, and you need the document's COMPLETE text

**\`mode:"content"\` (default)** — the only way to see a document's complete
text. Use it whenever missing part of the document could make the answer
wrong: summarize, extract or list ALL of something, check whether or where
a doc mentions X, review, or compare named docs. \`pipeshub_chat\` cannot do
these — it never sees a whole document.

Judge by the user's INTENT, not their keywords: "what's this doc about?",
"walk me through the report", "anything in here about Y?" are all
full-content tasks. Get the \`recordId\` from a \`pipeshub_search\` top hit, a
chat citation, or \`mode:"lookup"\`.

Returns one \`content\` string: a metadata header (title, source, key fields,
pre-generated summary) then the full parsed text. A record with no
extractable content returns the literal \`No record found\`. Use
\`pipeshub_download_record\` only for the original file bytes.

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
      return errorResult('`recordId` is required when mode is "content".');
    }
    const [result] = await connectorGetRecordContent(client, {
      recordId: args.recordId,
    }, fetchOptions).$inspect();
    if (!result.ok) return errorResult(result.error.message);

    // The SDK func uses errorCodes:[], so any non-2xx comes back as an
    // ok=false Response — surface it as an error rather than parsing it.
    const httpErr = await httpErrorResult(result.value, "Get record content");
    if (httpErr) return httpErr;

    // Success: the endpoint returns { content: <string> }. Hand the LLM the
    // plain text (real newlines), not the JSON wrapper.
    const parsed = await readJson<{ content?: string }>(result.value);
    if (!parsed.ok) return parsed.result;
    return { content: [{ type: "text", text: parsed.value.content ?? "" }] };
  },
};
