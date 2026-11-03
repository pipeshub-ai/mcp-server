import * as z from "zod";
import { recordsStreamRecordBuffer } from "../../funcs/recordsStreamRecordBuffer.js";
import { formatResult, ToolDefinition } from "../tools.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, httpErrorResult } from "./_helpers.js";

/**
 * The most characters (text, or base64 for a binary file) one download
 * returns: about 25k tokens, Claude Code's tool-output cap.
 */
export const DOWNLOAD_MAX_CHARS = 100_000;

const readInstead = (recordId: string) =>
  `Read its text in parts with \`pipeshub_get_record_content\` `
  + `\`mode:"content"\` and \`recordId:"${recordId}"\`.`;

/** Keep `result` under `max`: cut text, and refuse a file too big to send whole. */
function capped(result: CallToolResult, recordId: string, max: number): CallToolResult {
  const [item] = result.content;
  if (result.content.length !== 1 || !item) return result;
  if (item.type === "text") {
    if (item.text.length <= max) return result;
    return {
      content: [
        { type: "text", text: item.text.slice(0, max) },
        {
          type: "text",
          text: `[Cut at ${max.toLocaleString("en-US")} of `
            + `${item.text.length.toLocaleString("en-US")} characters. `
            + `${readInstead(recordId)}]`,
        },
      ],
    };
  }
  const size = item.type === "resource" && "blob" in item.resource
    ? item.resource.blob.length
    : item.type === "image" || item.type === "audio"
    ? item.data.length
    : 0;
  if (size <= max) return result;
  // An error, so a client saving the file (an older `pipeshub get --out`)
  // fails loudly rather than writing this note as the file.
  return {
    isError: true,
    content: [{
      type: "text",
      text: `The file is about ${Math.round(size * 3 / 4 / 1024).toLocaleString("en-US")} KB, `
        + "more than one tool result can carry, so it was not returned. "
        + `${readInstead(recordId)} Or open it in PipesHub.`,
    }],
  };
}

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
  maxChars: z.number().int().min(1).optional().describe(
    `Most characters to return (text, or base64 for a file). Default `
      + `${DOWNLOAD_MAX_CHARS.toLocaleString("en-US")}, about 25k tokens. Raise it `
      + "only to save the file to disk, never to read it.",
  ),
};

export const tool$pipeshubDownloadRecord: ToolDefinition<typeof args> = {
  name: "pipeshub_download_record",
  description:
    `Download the file as stored for one record — not PipesHub's parsed
content, metadata header, or summary.

Use this when the user wants the file itself (download, attach, open).

Do not use this to read, summarize, or answer "what does this doc
say?" regardless of format. That is \`pipeshub_get_record_content\`
\`mode:"content"\`. Text formats come back inline; images, audio, and
binary as base64.

\`convertTo\` accepts only \`application/pdf\`; anything else is ignored.
At most ${DOWNLOAD_MAX_CHARS.toLocaleString("en-US")} characters come back.`,
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
    const httpErr = await httpErrorResult(result.value, "Download");
    if (httpErr) return httpErr;

    // PipesHub's own parsed form of a page or message, not a file anyone stored.
    const type = result.value.headers.get("content-type") ?? "";
    if (type.split(";")[0]?.trim().toLowerCase() === "application/blocks") {
      await result.value.body?.cancel();
      return {
        content: [{
          type: "text",
          text: "This record has no stored file, only PipesHub's parsed "
            + `content. ${readInstead(args.recordId)}`,
        }],
      };
    }
    return capped(
      await formatResult(result.value),
      args.recordId,
      args.maxChars ?? DOWNLOAD_MAX_CHARS,
    );
  },
};
