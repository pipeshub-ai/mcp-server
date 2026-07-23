import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, readJson } from "./_helpers.js";

const args = {
  recordId: z.string().min(1).describe(
    "Record identifier — usually a UUID for connector-sourced records or "
      + "a 24-character ObjectId for uploaded records. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
  ),
};

export const tool$pipeshubGetRecordContent: ToolDefinition<typeof args> = {
  name: "pipeshub_get_record_content",
  description:
    `Read a record's full parsed content by \`recordId\` — the only way to
see a document's COMPLETE text.

Use it whenever the answer depends on a document's full content — any
task where missing a part could make the answer wrong: summarize / key
points / action items; extract or list ALL of something; check whether
or where the doc mentions X; translate, rewrite, outline, or review the
doc; compare named docs (fetch each); any question scoped to one named
document. \`pipeshub_chat\` cannot do these — it only sees a few
retrieved passages, never the whole document. Get the \`recordId\` from
a \`pipeshub_search\` top hit or a chat citation.

Judge by the user's INTENT, not their keywords: they need not say
"summarize", "key points", or "extract". Reason about what a good
answer requires — if it would need the whole document (e.g. "what's
this doc about?", "walk me through the report", "anything in here
about Y?"), that is a full-content task, so call this tool.

Returns a single \`content\` string: a short metadata header (title,
source, key fields, and a pre-generated summary) followed by the
record's full parsed text — paragraphs, tables, and lists in reading
order. For a record with no extractable content, \`content\` is the
literal \`No record found\`. Use \`pipeshub_download_record\` only when
you need the original file bytes.`,
  scopes: ["read"],
  annotations: {
    title: "Get a record's full parsed content",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const [result] = await connectorGetRecordContent(client, {
      recordId: args.recordId,
    }, { fetchOptions: { signal: ctx.signal } }).$inspect();
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
