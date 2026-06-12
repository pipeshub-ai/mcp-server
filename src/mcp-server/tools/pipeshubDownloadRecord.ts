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
    "Optional server-side format conversion target (e.g. `pdf`). When "
      + "omitted, the original file bytes are returned.",
  ),
};

export const tool$pipeshubDownloadRecord: ToolDefinition<typeof args> = {
  name: "pipeshub_download_record",
  description:
    `Stream the binary content of a single record from PipesHub.

Typical sources for the \`recordId\`:
- A chat citation:
  \`pipeshub_chat\` response → \`citations[*].recordId\`.
- A search result:
  \`pipeshub_search\` response → \`hits[*].recordId\` /
  \`uniqueRecords[*].recordId\`.

Response \`Content-Type\` is forwarded from the upstream service —
\`application/pdf\`, \`application/octet-stream\`, etc. Binary content is
returned base64-encoded; text content is returned inline.`,
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
