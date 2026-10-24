// Commands that fill a workspace: create a collection, upload local files,
// check indexing, and get the link to connect a source.
//
// `upload` posts straight to the REST upload endpoint instead of going through
// /mcp: the files are on this machine, and /mcp caps a request body at 5 MB.

import { lstat, readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { PipeshubCore } from "../core.js";
import { uploadMimeType, uploadToCollection } from "../mcp-server/tools/_writeHelpers.js";
import { callTool, decodeToolJson, joinText, toolErrorToExit } from "./client.js";
import type { Ctx, Outcome } from "./commands.js";
import { CliError, EXIT, assertTransport } from "./config.js";

/** Files per upload request; the server takes up to 1000, smaller batches report progress sooner. */
const BATCH_FILES = 50;
/** Bytes per upload request, so one request stays well under proxy body limits. */
const BATCH_BYTES = 50 * 1024 * 1024;

export async function collectionCreate(ctx: Ctx, name: string): Promise<Outcome> {
  const out = decodeToolJson(await callTool(ctx, "pipeshub_create_collection", { name }));
  return { exit: EXIT.OK, payload: { requestId: ctx.requestId, ...(out as object) } };
}

export async function indexingStatus(ctx: Ctx, collectionId: string): Promise<Outcome> {
  const out = decodeToolJson(await callTool(ctx, "pipeshub_indexing_status", { collectionId }));
  return { exit: EXIT.OK, payload: { requestId: ctx.requestId, ...(out as object) } };
}

export async function connectSource(ctx: Ctx, connector: string | undefined): Promise<Outcome> {
  const out = decodeToolJson(
    await callTool(ctx, "pipeshub_connect_source", connector ? { connector } : {}),
  ) as { url?: string };
  return {
    exit: EXIT.OK,
    payload: { requestId: ctx.requestId, ...(out as object) },
    ...(out.url ? { text: `Open ${out.url} and sign in to the connector.` } : {}),
  };
}

/**
 * Every file under `paths`. Paths the user names are followed; inside a
 * folder, dot-entries and symlinks are skipped, so a link cannot pull in a
 * file from outside it (or loop back on a parent).
 */
async function listFiles(paths: string[]): Promise<{ files: string[]; links: string[] }> {
  const files: string[] = [];
  const links: string[] = [];
  const walk = async (p: string, named: boolean): Promise<void> => {
    const s = await (named ? stat(p) : lstat(p)).catch(() => {
      throw new CliError(`no such file or directory: ${p}`, EXIT.USAGE);
    });
    if (s.isSymbolicLink()) {
      links.push(p);
      return;
    }
    if (s.isFile()) {
      files.push(p);
      return;
    }
    if (!s.isDirectory()) return;
    for (const entry of await readdir(p)) {
      if (!entry.startsWith(".")) await walk(join(p, entry), false);
    }
  };
  for (const p of paths) await walk(p, true);
  return { files, links };
}

export async function upload(ctx: Ctx, collectionId: string, paths: string[]): Promise<Outcome> {
  // Checked before any read: the token and the files go to this origin.
  assertTransport(ctx.origin, ctx.insecureHttp);
  const { files, links } = await listFiles(paths);
  const skipped = [
    ...links.map((f) => ({ path: f, reason: "symlink inside a folder" })),
    ...files.filter((f) => !uploadMimeType(f)).map((f) => ({ path: f, reason: "unsupported extension" })),
  ];
  const wanted = files.filter((f) => uploadMimeType(f));
  if (wanted.length === 0) {
    throw new CliError(
      `nothing to upload: ${files.length === 0 ? "no files found" : "no file has a supported extension"}`,
      EXIT.USAGE,
    );
  }

  const client = new PipeshubCore({
    serverURL: `${ctx.origin}/api/v1`,
    security: { bearerAuth: ctx.token },
    ...(ctx.timeoutMs ? { timeoutMs: ctx.timeoutMs } : {}),
  });
  const uploaded: Array<{ recordId: string; name: string }> = [];
  const failed: Array<{ name: string; errors: string[]; recordId?: string }> = [];
  let incomplete = false;

  let batch: Array<{ name: string; bytes: Uint8Array; type: string }> = [];
  let batchBytes = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    const r = await uploadToCollection(client, collectionId, batch);
    if (!r.ok) {
      const message = joinText(r.result.content as never) || "upload failed";
      // Earlier batches are stored; say so rather than losing them in the error.
      throw new CliError(
        uploaded.length > 0 ? `${message} (${uploaded.length} file(s) uploaded before this)` : message,
        toolErrorToExit(message),
      );
    }
    uploaded.push(...r.outcome.uploaded);
    failed.push(...r.outcome.failed);
    if (r.outcome.summary === null) incomplete = true;
    batch = [];
    batchBytes = 0;
  };
  for (const path of wanted) {
    const bytes = new Uint8Array(await readFile(path));
    if (batch.length >= BATCH_FILES || (batch.length > 0 && batchBytes + bytes.length > BATCH_BYTES)) await flush();
    batch.push({ name: basename(path), bytes, type: uploadMimeType(path)! });
    batchBytes += bytes.length;
  }
  await flush();

  return {
    exit: failed.length > 0 || incomplete ? EXIT.ERROR : EXIT.OK,
    payload: {
      requestId: ctx.requestId,
      collectionId,
      uploaded,
      failed,
      ...(skipped.length > 0 ? { skipped } : {}),
      ...(incomplete
        ? { note: "An upload stream ended early: files not listed as uploaded or failed may not have been stored." }
        : {}),
      next: `pipeshub status ${collectionId}`,
    },
    text: `${uploaded.length} uploaded, ${failed.length} failed, ${skipped.length} skipped.`
      + ` Indexing runs in the background: pipeshub status ${collectionId}`,
  };
}
