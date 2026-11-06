// pipeshub_indexing_status — has a collection or a connector (a crawled website)
// finished indexing? The counts are the source's stats, exact at any size and
// without the folder placeholders a web crawl stores (they never index); two
// filtered listings name the pending and failed records.

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";
import { PipeshubCore } from "../../core.js";
import { connectorGetConnectorStats } from "../../funcs/connectorGetConnectorStats.js";
import { connectorGetInstance, knowledgeHubCollectionRecords } from "../../funcs/knowledgeBaseWrite.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";

/** Records still in flight, or failed, that the answer names. */
const MAX_LISTED = 25;
const PENDING = ["NOT_STARTED", "QUEUED", "IN_PROGRESS", "PAUSED"] as const;
const FAILED = ["FAILED", "FILE_TYPE_NOT_SUPPORTED", "EMPTY", "ENABLE_MULTIMODAL_MODELS"] as const;

const args = {
  collectionId: z.string().uuid().describe(
    "The collection to check (`collectionId` from create or upload), or a web source's `connectorId`.",
  ),
};

type Node = { id?: string; name?: string; indexingStatus?: string | null; reason?: string | null; isInternal?: boolean };

/** The first `limit` matching records, without internal ones (a crawl's folder placeholders). */
async function listRecords(
  client: PipeshubCore,
  kbId: string,
  limit: number,
  signal: AbortSignal,
  indexingStatus?: readonly string[],
): Promise<{ ok: true; records: object[] } | { ok: false; result: CallToolResult }> {
  const r = await knowledgeHubCollectionRecords(
    client,
    kbId,
    indexingStatus ? { limit, indexingStatus } : { limit },
    { fetchOptions: { signal } },
  );
  if (!r.ok) return { ok: false, result: errorResult(`Indexing status: ${r.error.message}`) };
  const httpErr = await httpErrorResult(r.value, "Indexing status");
  if (httpErr) return { ok: false, result: httpErr };
  const body = await readJson<{ items?: Node[] }>(r.value, "Indexing status");
  if (!body.ok) return { ok: false, result: body.result };
  const items = (body.value.items ?? []).filter((n) => n.isInternal !== true);
  return {
    ok: true,
    records: items.map((n) => ({
      recordId: n.id,
      name: n.name,
      status: n.indexingStatus ?? "UNKNOWN",
      ...(n.reason ? { reason: n.reason } : {}),
    })),
  };
}

type Stats = { total: number; byStatus: Record<string, number> };

/** `GET /connectors/{id}/stats`: the same counts the source's settings page shows. */
async function sourceStats(
  client: PipeshubCore,
  id: string,
  signal: AbortSignal,
): Promise<{ ok: true; stats: Stats } | { ok: false; result: CallToolResult }> {
  const r = await connectorGetConnectorStats(client, { connectorId: id }, { fetchOptions: { signal } });
  if (!r.ok) return { ok: false, result: errorResult(`Indexing status: ${r.error.message}`) };
  const body = await readJson<{ data?: { stats?: { total?: number; indexingStatus?: Record<string, number> } } }>(
    r.value,
    "Indexing status",
  );
  if (!body.ok) return { ok: false, result: body.result };
  const stats = body.value.data?.stats;
  if (typeof stats?.total !== "number") return { ok: false, result: errorResult("Indexing status: the response carried no counts.") };
  return { ok: true, stats: { total: stats.total, byStatus: stats.indexingStatus ?? {} } };
}

/** A connector in these states may store more records (a crawl writes pages in batches). */
const RUNNING = new Set(["QUEUED", "SYNCING", "FULL_SYNCING"]);

/**
 * Whether the source is still syncing. Any failure (a collection, or a token
 * without connector:read) answers false, leaving the record counts in charge.
 */
async function stillSyncing(client: PipeshubCore, id: string, signal: AbortSignal): Promise<boolean> {
  const r = await connectorGetInstance(client, id, { fetchOptions: { signal } });
  if (!r.ok || !r.value.ok) {
    if (r.ok) await r.value.body?.cancel();
    return false;
  }
  const body = await readJson<{ connector?: { status?: string | null } }>(r.value, "Indexing status");
  return body.ok && RUNNING.has(body.value.connector?.status ?? "");
}

const sum = (byStatus: Record<string, number>, statuses: readonly string[]) =>
  statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0);

export const tool$pipeshubIndexingStatus: ToolDefinition<typeof args> = {
  name: "pipeshub_indexing_status",
  description:
    `Indexing progress of a collection or web source. Call after
\`pipeshub_upload\`, then every 15–30 s while \`done\` is false: search
finds only COMPLETED documents. Returns \`{ done, total, pendingCount,
failedCount, pending, failed }\`; tell the user about \`failed\` entries (FAILED,
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
    const [stats, pending, failed, syncing] = await Promise.all([
      sourceStats(client, args.collectionId, ctx.signal),
      listRecords(client, args.collectionId, MAX_LISTED, ctx.signal, PENDING),
      listRecords(client, args.collectionId, MAX_LISTED, ctx.signal, FAILED),
      stillSyncing(client, args.collectionId, ctx.signal),
    ]);
    if (!stats.ok) return stats.result;
    if (!pending.ok) return pending.result;
    if (!failed.ok) return failed.result;
    const { total, byStatus } = stats.stats;
    const pendingCount = sum(byStatus, PENDING);
    return jsonResult({
      // Nothing stored is not done: a crawl stores its first page some time after it
      // starts, and while it runs it may store more after these are indexed.
      done: total > 0 && pendingCount === 0 && !syncing,
      ...(syncing ? { syncing: true } : {}),
      total,
      pendingCount,
      failedCount: sum(byStatus, FAILED),
      pending: pending.records,
      failed: failed.records,
      ...(total === 0 ? { note: "No records yet: an upload or a crawl may still be adding them. Keep polling." } : {}),
    });
  },
};
