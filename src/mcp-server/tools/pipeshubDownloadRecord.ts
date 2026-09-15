import * as z from "zod";
import { recordsStreamRecordBuffer } from "../../funcs/recordsStreamRecordBuffer.js";
import { formatResult, ToolDefinition } from "../tools.js";
import { errorResult } from "./_helpers.js";

const args = {
  recordId: z.string().min(1).describe(
    "Record identifier — usually a UUID for connector-sourced records or "
      + "a 24-character ObjectId for uploaded records. Get it from a chat "
      + "citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
  ),
  convertTo: z.string().optional().describe(
    "The only conversion target connectors honour is `application/pdf` "
      + "(the MIME type, not `pdf`). A bare `pdf` is ignored and the "
      + "original file is returned with no error. Omit for the file as "
      + "stored. Does not parse the document — use "
      + "`pipeshub_get_record_content` `mode:\"content\"` for that.",
  ),
};

export const tool$pipeshubDownloadRecord: ToolDefinition<typeof args> = {
  name: "pipeshub_download_record",
  description:
    `Download the file as stored for one record — not PipesHub's parsed
content, metadata header, or summary.

Use this when the user wants the file itself (download, attach, open).
Get \`recordId\` from a chat citation or a \`pipeshub_search\` hit.

Do not use this to read, summarize, or answer "what does this doc
say?" regardless of format. That is \`pipeshub_get_record_content\`
\`mode:"content"\`. Text formats come back inline; images, audio, and
binary as base64.

\`convertTo\` accepts only \`application/pdf\`; anything else is ignored.`,
  scopes: ["read"],
  annotations: {
    title: "Download a document by record id",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const [result] = await recordsStreamRecordBuffer(client, {
      recordId: args.recordId,
      convertTo: args.convertTo,
    }, { fetchOptions: { signal: ctx.signal } }).$inspect();
    if (!result.ok) return errorResult(result.error.message);

    return formatResult(result.value);
  },
};
