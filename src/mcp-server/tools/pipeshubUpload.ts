// pipeshub_upload — add documents to a collection. The remote MCP server cannot
// read the agent's disk, so content travels inline: text, or base64 for binary
// files. Big files and whole folders go through the `pipeshub upload` CLI.

import * as z from "zod";
import { ToolDefinition } from "../tools.js";
import { errorResult, jsonResult } from "./_helpers.js";
import { UPLOAD_MIME_TYPES, uploadMimeType, uploadToCollection } from "./_writeHelpers.js";

/** Inline content shares the /mcp request body cap (5 MB), with room for base64 and JSON overhead. */
export const MAX_INLINE_UPLOAD_BYTES = 3 * 1024 * 1024;

const document = z.object({
  name: z.string().trim().min(1).max(255).describe(
    "File name with an extension that sets its type, e.g. \"design.md\", \"q3.pdf\".",
  ),
  text: z.string().optional().describe("The document's text, for text formats (md, txt, html, csv, json, …)."),
  base64: z.string().optional().describe("The file's bytes, base64-encoded, for binary formats (pdf, docx, png, …)."),
});

const args = {
  collectionId: z.string().uuid().describe(
    "Collection to add to: `collectionId` from `pipeshub_create_collection`, or a "
      + "`kind: \"knowledgeBase\"` id from `pipeshub_sources`.",
  ),
  documents: z.array(document).min(1).max(20).describe(
    "1–20 documents. Each needs a `name` and exactly one of `text` or `base64`.",
  ),
};

export const tool$pipeshubUpload: ToolDefinition<typeof args> = {
  name: "pipeshub_upload",
  description:
    `Upload documents into a **collection** so they can be searched with
citations and permissions. Pass each inline: \`text\` for text formats,
\`base64\` for binary ones (pdf, docx, pptx, xlsx, md, txt, html, csv, json,
png, …). Up to 20 documents and ~3 MB per call; for bigger files or a folder,
the user runs \`pipeshub upload <collectionId> <path>\`. Returns \`{ uploaded:
[{ recordId, name }], failed: [{ name, errors }], summary }\`. Indexing follows
in the background: poll \`pipeshub_indexing_status\` before searching. For
Slack, Drive, Jira and other tools use \`pipeshub_connect_source\`.`,
  scopes: ["write"],
  annotations: {
    title: "Upload documents to a PipesHub collection",
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const files = [];
    const problems: string[] = [];
    let total = 0;
    for (const d of args.documents) {
      const type = uploadMimeType(d.name);
      if (!type) {
        problems.push(`${d.name}: unsupported extension`);
        continue;
      }
      if ((d.text === undefined) === (d.base64 === undefined)) {
        problems.push(`${d.name}: give exactly one of text or base64`);
        continue;
      }
      const bytes = d.text !== undefined
        ? new TextEncoder().encode(d.text)
        : Uint8Array.from(Buffer.from(d.base64!, "base64"));
      if (bytes.length === 0) {
        problems.push(`${d.name}: empty`);
        continue;
      }
      total += bytes.length;
      files.push({ name: d.name, bytes, type });
    }
    if (problems.length > 0) {
      return errorResult(
        `Nothing uploaded. Fix these documents and call again: ${problems.join("; ")}.`
          + ` Supported extensions: ${Object.keys(UPLOAD_MIME_TYPES).join(", ")}.`,
      );
    }
    if (total > MAX_INLINE_UPLOAD_BYTES) {
      return errorResult(
        `Nothing uploaded: ${(total / 1024 / 1024).toFixed(1)} MB is over the 3 MB inline limit.`
          + ` Split the documents across calls, or have the user run`
          + ` \`pipeshub upload ${args.collectionId} <path>\`.`,
      );
    }

    const up = await uploadToCollection(client, args.collectionId, files, ctx.signal);
    if (!up.ok) return up.result;
    const { outcome } = up;
    return jsonResult({
      ...outcome,
      ...(outcome.summary === null
        ? { note: "The upload stream ended without a summary; files not listed may not have been stored." }
        : {}),
      ...(outcome.uploaded.length > 0
        ? { next: `Call pipeshub_indexing_status with collectionId ${args.collectionId} before searching.` }
        : {}),
    });
  },
};
