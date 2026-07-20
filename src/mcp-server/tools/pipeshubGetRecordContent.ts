import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { formatResult, ToolDefinition } from "../tools.js";
import { errorResult, jsonResult, readJson } from "./_helpers.js";

const args = {
  recordId: z.string().min(1).describe(
    "Record identifier — usually a UUID for connector-sourced records or "
      + "a 24-character ObjectId for uploaded records. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
  ),
  fetchFullContent: z.boolean().default(false).describe(
    "When false (default), return metadata only (record fields + "
      + "`context_metadata` summary). When true, also include "
      + "`block_containers` — the full raw parsed blocks. Set true "
      + "whenever the task depends on the document's actual text "
      + "(summarize, extract, verify a mention, translate, review).",
  ),
};

export const tool$pipeshubGetRecordContent: ToolDefinition<typeof args> = {
  name: "pipeshub_get_record_content",
  description:
    `Read a record's parsed content by \`recordId\` — the only way to see
a document's FULL text.

Use it whenever the answer depends on a document's complete content —
any task where missing a part could make the answer wrong: summarize /
key points / action items; extract or list ALL of something; check
whether or where the doc mentions X; translate, rewrite, outline, or
review the doc; compare named docs (fetch each); any question scoped to
one named document. \`pipeshub_chat\` cannot do these — it only sees a
few retrieved passages, never the whole document. Get the \`recordId\`
from a \`pipeshub_search\` top hit or a chat citation.

\`fetchFullContent: false\` (default) returns record fields plus
\`context_metadata\` — a short pre-generated summary, enough to identify
the record or give a quick gist. \`fetchFullContent: true\` also returns
\`block_containers\`, the full parsed text — required for the tasks
above: a faithful summary or extraction cannot come from the pre-baked
summary.

Response keys are snake_case (\`record_name\`, \`record_type\`, ...). Use
\`pipeshub_download_record\` only when you need the original file bytes.`,
  scopes: ["read"],
  annotations: {
    title: "Get a record's metadata or full parsed content",
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

    // Full content, or any non-2xx response: hand back the body untouched.
    if (args.fetchFullContent || !result.value.ok) {
      return formatResult(result.value);
    }

    // Metadata only: drop the heavy raw blocks, keep record fields + summary.
    const parsed = await readJson<{ record?: Record<string, unknown> }>(
      result.value,
    );
    if (!parsed.ok) return parsed.result;
    if (parsed.value?.record) delete parsed.value.record["block_containers"];
    return jsonResult(parsed.value);
  },
};
