import * as z from "zod";
import { recordsStreamRecordBuffer } from "../../funcs/recordsStreamRecordBuffer.js";
import { valueToBase64 } from "../shared.js";
import { ToolDefinition } from "../tools.js";
import { errorResult } from "./_helpers.js";

/** Largest slice of a file one call returns, before base64. */
export const PREVIEW_CHUNK_BYTES = 512 * 1024;

const args = {
  recordId: z.string().min(1).describe("Record to preview."),
  offset: z.number().int().min(0).default(0).describe(
    "Byte offset of the slice. Pass the previous call's `nextOffset`.",
  ),
};

/**
 * Only the citation viewer calls this: `ui.visibility: ["app"]` hides it
 * from the model in MCP Apps hosts. It returns the record's file as stored,
 * in slices that fit in one tool result.
 */
export const tool$pipeshubPreviewRecord: ToolDefinition<typeof args> = {
  name: "pipeshub_preview_record",
  description: "Used by PipesHub's citation viewer only. Do not call it.",
  scopes: ["read"],
  _meta: { ui: { visibility: ["app"] } },
  annotations: {
    title: "Preview a record (citation viewer)",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const [result] = await recordsStreamRecordBuffer(client, {
      recordId: args.recordId,
    }, { fetchOptions: { signal: ctx.signal } }).$inspect();
    if (!result.ok) return errorResult(result.error.message);
    const response = result.value;
    if (!response.ok) {
      return errorResult(`Could not load the record (HTTP ${response.status}).`);
    }

    // shortcut: every slice downloads the whole file and cuts it here; send a
    // Range header once the stream endpoint honours one, if large files are slow.
    const file = new Uint8Array(await response.arrayBuffer());
    const offset = Math.min(args.offset, file.length);
    const slice = file.subarray(offset, offset + PREVIEW_CHUNK_BYTES);
    const nextOffset = offset + slice.length;
    return {
      content: [{
        type: "text",
        text: `${slice.length} bytes at ${offset} of ${file.length}.`,
      }],
      structuredContent: {
        mimeType: (response.headers.get("content-type") ?? "").split(";")[0],
        totalBytes: file.length,
        offset,
        bytes: await valueToBase64(slice) ?? "",
        ...(nextOffset < file.length ? { nextOffset } : {}),
      },
    };
  },
};
