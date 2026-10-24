// Shared by the write tools and the `pipeshub upload` CLI command.

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PipeshubCore } from "../../core.js";
import { knowledgeBaseUpload, UploadFile } from "../../funcs/knowledgeBaseWrite.js";
import { errorResult, httpErrorResult, iterateSSE } from "./_helpers.js";

/**
 * Extensions an upload may carry, with the MIME type PipesHub expects for each
 * (a subset of the server's `extensionToMimeType`: the document and image
 * types worth indexing). The server rejects a type it does not list.
 */
export const UPLOAD_MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  mdx: "text/mdx",
  html: "text/html",
  htm: "text/html",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  xml: "text/xml",
  rtf: "text/rtf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  odt: "application/vnd.oasis.opendocument.text",
  epub: "application/epub+zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** The MIME type for `name`'s extension, or null when uploads do not accept it. */
export function uploadMimeType(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  return UPLOAD_MIME_TYPES[name.slice(dot + 1).toLowerCase()] ?? null;
}

/** The PipesHub web origin behind an API base URL like `https://host/api/v1`. */
export function webOrigin(client: PipeshubCore): string {
  return new URL(client._baseURL?.toString() ?? "http://localhost:3000").origin;
}

export type UploadOutcome = {
  uploaded: Array<{ recordId: string; name: string }>;
  failed: Array<{ name: string; errors: string[]; recordId?: string }>;
  summary: { total: number; succeeded: number; failed: number } | null;
};

/**
 * Upload `files` to collection `kbId` and read the SSE answer to the end.
 * A stream that stops without `done` keeps what it reported, with
 * `summary: null`, so the caller can say the outcome is incomplete.
 */
export async function uploadToCollection(
  client: PipeshubCore,
  kbId: string,
  files: UploadFile[],
  signal?: AbortSignal,
): Promise<{ ok: true; outcome: UploadOutcome } | { ok: false; result: CallToolResult }> {
  const r = await knowledgeBaseUpload(
    client,
    kbId,
    files,
    signal ? { fetchOptions: { signal } } : undefined,
  );
  if (!r.ok) return { ok: false, result: errorResult(`Upload: ${r.error.message}`) };
  const httpErr = await httpErrorResult(r.value, "Upload");
  if (httpErr) return { ok: false, result: httpErr };

  const outcome: UploadOutcome = { uploaded: [], failed: [], summary: null };
  try {
    for await (const frame of iterateSSE(r.value)) {
      const d = (frame.data ?? {}) as {
        recordId?: unknown;
        fileName?: unknown;
        errors?: unknown;
        summary?: UploadOutcome["summary"];
        message?: unknown;
      };
      if (frame.event === "file:succeeded") {
        outcome.uploaded.push({ recordId: String(d.recordId), name: String(d.fileName) });
      } else if (frame.event === "file:failed") {
        outcome.failed.push({
          name: String(d.fileName),
          errors: Array.isArray(d.errors) ? d.errors.map(String) : [],
          ...(d.recordId ? { recordId: String(d.recordId) } : {}),
        });
      } else if (frame.event === "done") {
        outcome.summary = d.summary ?? null;
      } else if (frame.event === "error") {
        return {
          ok: false,
          result: errorResult(
            `Upload stopped: ${typeof d.message === "string" ? d.message : "server error"}. `
              + `${outcome.uploaded.length} file(s) were stored before it stopped.`,
          ),
        };
      }
    }
  } catch (err) {
    // A dropped connection keeps what was already reported (summary stays
    // null, which callers report as incomplete); a cancelled call does not.
    if (signal?.aborted) throw err;
  }
  return { ok: true, outcome };
}
