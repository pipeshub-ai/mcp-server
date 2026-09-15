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
    "Optional server-side conversion before streaming (e.g. `pdf` to "
      + "preview an Office file as PDF). Omit for the original bytes. "
      + "Does not extract text — use `pipeshub_get_record_content` "
      + "`mode:\"content\"` to read what the document says.",
  ),
};

export const tool$pipeshubDownloadRecord: ToolDefinition<typeof args> = {
  name: "pipeshub_download_record",
  description:
    `Download the original file of one record — the bytes, not extracted
text.

Use this when the user wants the file itself (download, attach, open,
convert). Get \`recordId\` from a chat citation or a \`pipeshub_search\`
hit.

Do not use this to read, summarize, or answer "what does this doc
say?" That is \`pipeshub_get_record_content\` \`mode:"content"\`.
Returns opaque bytes (base64 for binary).

\`convertTo\` (e.g. \`pdf\`) converts on the server before streaming;
omit it for the original bytes.`,
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
