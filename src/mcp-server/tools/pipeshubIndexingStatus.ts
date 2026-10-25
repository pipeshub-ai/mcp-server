// pipeshub_indexing_status — has a collection finished indexing? Three
// filtered listings (pending, failed, all records) whose totals are exact at
// any collection size, so `done` never waits on a page cap.

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";
import { PipeshubCore } from "../../core.js";
import { knowledgeHubCollectionRecords } from "../../funcs/knowledgeBaseWrite.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";

/** Records still in flight, or failed, that the answer names. */
const MAX_LISTED = 25;
const PENDING = ["NOT_STARTED", "QUEUED", "IN_PROGRESS", "PAUSED"] as const;
const FAILED = ["FAILED", "FILE_TYPE_NOT_SUPPORTED", "EMPTY", "ENABLE_MULTIMODAL_MODELS"] as const;

const args = {
  collectionId: z.string().uuid().describe("The collection to check (`collectionId` from create or upload)."),
};

type Node = { id?: string; name?: string; indexingStatus?: string | null; reason?: string | null };

/** The matching records' count and the first `limit` of them. */
async function countRecords(
  client: PipeshubCore,
  kbId: string,
  limit: number,
  signal: AbortSignal,
  indexingStatus?: readonly string[],
): Promise<{ ok: true; count: number; records: object[] } | { ok: false; result: CallToolResult }> {
  const r = await knowledgeHubCollectionRecords(
    client,
    kbId,
    indexingStatus ? { limit, indexingStatus } : { limit },
    { fetchOptions: { signal } },
  );
  if (!r.ok) return { ok: false, result: errorResult(`Indexing status: ${r.error.message}`) };
  const httpErr = await httpErrorResult(r.value, "Indexing status");
  if (httpErr) return { ok: false, result: httpErr };
  const body = await readJson<{ items?: Node[]; pagination?: { totalItems?: number } | null }>(
    r.value,
    "Indexing status",
  );
  if (!body.ok) return { ok: false, result: body.result };
  const items = body.value.items ?? [];
  return {
    ok: true,
    count: body.value.pagination?.totalItems ?? items.length,
    records: items.map((n) => ({
      recordId: n.id,
      name: n.name,
      status: n.indexingStatus ?? "UNKNOWN",
      ...(n.reason ? { reason: n.reason } : {}),
    })),
  };
}

export const tool$pipeshubIndexingStatus: ToolDefinition<typeof args> = {
  name: "pipeshub_indexing_status",
  description:
    `Indexing progress of a collection. Call after \`pipeshub_upload\`, then
every 15–30 s while \`done\` is false: search finds only COMPLETED
documents. Returns \`{ done, total, pendingCount, failedCount, pending,
failed }\`; tell the user about \`failed\` entries (FAILED,
FILE_TYPE_NOT_SUPPORTED, EMPTY, ENABLE_MULTIMODAL_MODELS, with a \`reason\`).
AUTO_INDEX_OFF and SKIPPED count in \`total\` only.`,
  scopes: ["read"],
  annotations: {
    title: "Check a PipesHub collection's indexing progress",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const [pending, failed, all] = await Promise.all([
      countRecords(client, args.collectionId, MAX_LISTED, ctx.signal, PENDING),
      countRecords(client, args.collectionId, MAX_LISTED, ctx.signal, FAILED),
      countRecords(client, args.collectionId, 1, ctx.signal),
    ]);
    if (!pending.ok) return pending.result;
    if (!failed.ok) return failed.result;
    if (!all.ok) return all.result;
    return jsonResult({
      done: pending.count === 0,
      total: all.count,
      pendingCount: pending.count,
      failedCount: failed.count,
      pending: pending.records,
      failed: failed.records,
      ...(all.count === 0 ? { note: "The collection has no records yet." } : {}),
    });
  },
};
