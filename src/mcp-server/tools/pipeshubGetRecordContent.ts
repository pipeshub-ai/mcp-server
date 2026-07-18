import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { formatResult, ToolDefinition } from "../tools.js";
import { errorResult } from "./_helpers.js";

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
    `Get a record's full parsed content and metadata.

Returns the already-parsed, structured content of a single record —
the same content PipesHub's RAG/chat pipeline uses — including
\`context_metadata\` (human/LLM-readable summary) and
\`block_containers\` (blocks / block_groups). Prefer
\`context_metadata\` unless you need the raw structured blocks.

**When to use this vs. \`pipeshub_download_record\`:**
- This tool — read the record's textual/tabular content without
  downloading and re-parsing the original file.
- \`pipeshub_download_record\` — fetch the original file bytes
  (download, attach, open).

**Typical flow:** obtain a \`recordId\` from a \`pipeshub_search\` hit
or a chat citation, then call this when the search snippet or
citation excerpt isn't enough.

**Note:** the response \`record\` object uses snake_case keys
(\`record_name\`, \`record_type\`, ...), not camelCase.`,
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

    return formatResult(result.value);
  },
};
