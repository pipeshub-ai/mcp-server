import { createHash } from "node:crypto";
import * as z from "zod";
import { PipeshubCore } from "../../core.js";
import { recordsStreamRecordBuffer } from "../../funcs/recordsStreamRecordBuffer.js";
import { extractSecurity } from "../../lib/security.js";
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

type StoredFile = { bytes: Uint8Array; mimeType: string };

/**
 * Files fetched for a preview, kept briefly so the slices of one file come
 * from one download, not one each. Keyed by the caller's credential, so one
 * user's file never answers another's request; bounded in time and bytes.
 */
const fileCache = new Map<string, { file: Promise<StoredFile>; at: number; size: number }>();
/** How long a fetched file serves its slices. */
export const FILE_CACHE_TTL_MS = 2 * 60_000;
/** Bytes all cached files may hold together; the oldest go first. */
export const FILE_CACHE_MAX_BYTES = 200 * 1024 * 1024;

/** Who is asking and for what: the credential's hash, the server, the record. */
async function cacheKey(client: PipeshubCore, recordId: string): Promise<string | undefined> {
  const security: any = await extractSecurity(client._options.security as any);
  const credential = security?.bearerAuth || (security?.oauth2 ? JSON.stringify(security.oauth2) : "");
  if (!credential) return undefined;
  const who = createHash("sha256").update(String(credential)).digest("hex");
  return `${who}|${client._baseURL ?? ""}|${recordId}`;
}

function evict(now: number) {
  let total = 0;
  for (const [key, entry] of [...fileCache].reverse()) {
    if (now - entry.at > FILE_CACHE_TTL_MS || total + entry.size > FILE_CACHE_MAX_BYTES) {
      fileCache.delete(key);
    } else {
      total += entry.size;
    }
  }
}

async function download(client: PipeshubCore, recordId: string, signal: AbortSignal): Promise<StoredFile> {
  const [result] = await recordsStreamRecordBuffer(client, { recordId }, {
    fetchOptions: { signal },
  }).$inspect();
  if (!result.ok) throw new Error(result.error.message);
  const response = result.value;
  if (!response.ok) throw new Error(`Could not load the record (HTTP ${response.status}).`);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: (response.headers.get("content-type") ?? "").split(";")[0] ?? "",
  };
}

/** The record's file: from the cache while it is fresh, else downloaded once. */
export async function previewFile(
  client: PipeshubCore,
  recordId: string,
  signal: AbortSignal,
): Promise<StoredFile> {
  const key = await cacheKey(client, recordId);
  if (!key) return download(client, recordId, signal);
  const now = Date.now();
  evict(now);
  const hit = fileCache.get(key);
  if (hit) return hit.file;
  // The first slice's request may be cancelled; the download must not be
  // tied to it, or the next slice would find a failed entry.
  const file = download(client, recordId, AbortSignal.timeout(FILE_CACHE_TTL_MS));
  const entry = { file, at: now, size: 0 };
  fileCache.set(key, entry);
  file.then((f) => {
    entry.size = f.bytes.length;
    evict(Date.now());
  }, () => fileCache.delete(key));
  return file;
}

/** Empties the preview cache: for tests. */
export function clearPreviewCache() {
  fileCache.clear();
}

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
    let stored: StoredFile;
    try {
      stored = await previewFile(client, args.recordId, ctx.signal);
    } catch (err) {
      return errorResult((err as Error).message);
    }
    const file = stored.bytes;
    const offset = Math.min(args.offset, file.length);
    const slice = file.subarray(offset, offset + PREVIEW_CHUNK_BYTES);
    const nextOffset = offset + slice.length;
    return {
      content: [{
        type: "text",
        text: `${slice.length} bytes at ${offset} of ${file.length}.`,
      }],
      structuredContent: {
        mimeType: stored.mimeType,
        totalBytes: file.length,
        offset,
        bytes: await valueToBase64(slice) ?? "",
        ...(nextOffset < file.length ? { nextOffset } : {}),
      },
    };
  },
};
