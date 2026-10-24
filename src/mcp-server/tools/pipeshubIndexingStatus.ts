// pipeshub_indexing_status — has a collection finished indexing? Counts the
// collection's records by indexing status, one paged listing, no per-record calls.

import * as z from "zod";
import { knowledgeHubCollectionRecords } from "../../funcs/knowledgeBaseWrite.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
/** Records still in flight, or failed, that the answer names. */
const MAX_LISTED = 25;
const PENDING = new Set(["NOT_STARTED", "QUEUED", "IN_PROGRESS", "PAUSED"]);
const FAILED = new Set(["FAILED", "FILE_TYPE_NOT_SUPPORTED", "EMPTY", "ENABLE_MULTIMODAL_MODELS"]);

const args = {
  collectionId: z.string().uuid().describe("The collection to check (`collectionId` from create or upload)."),
};

type Node = { id?: string; name?: string; nodeType?: string; indexingStatus?: string | null; reason?: string | null };

export const tool$pipeshubIndexingStatus: ToolDefinition<typeof args> = {
  name: "pipeshub_indexing_status",
  description:
    `How far a collection's documents are through indexing. Call after
\`pipeshub_upload\`, then every 15–30 s while \`done\` is false: search finds
a document only once it is COMPLETED. Returns \`{ done, total, counts, pending,
failed }\`; \`failed\` entries carry the server's \`reason\` (FAILED,
FILE_TYPE_NOT_SUPPORTED, EMPTY: tell the user). AUTO_INDEX_OFF and SKIPPED are
not indexed by the org's settings.`,
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
    const counts: Record<string, number> = {};
    const pending: object[] = [];
    const failed: object[] = [];
    let total = 0;
    let truncated = true;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const r = await knowledgeHubCollectionRecords(
        client,
        args.collectionId,
        { page, limit: PAGE_SIZE },
        { fetchOptions: { signal: ctx.signal } },
      );
      if (!r.ok) return errorResult(`Indexing status: ${r.error.message}`);
      const httpErr = await httpErrorResult(r.value, "Indexing status");
      if (httpErr) return httpErr;
      const body = await readJson<{ items?: Node[]; pagination?: { hasNext?: boolean } | null }>(
        r.value,
        "Indexing status",
      );
      if (!body.ok) return body.result;
      const items = body.value.items ?? [];
      for (const n of items) {
        if (n.nodeType !== "record") continue;
        const status = n.indexingStatus ?? "UNKNOWN";
        total++;
        counts[status] = (counts[status] ?? 0) + 1;
        const entry = { recordId: n.id, name: n.name, status, ...(n.reason ? { reason: n.reason } : {}) };
        if (PENDING.has(status) && pending.length < MAX_LISTED) pending.push(entry);
        if (FAILED.has(status) && failed.length < MAX_LISTED) failed.push(entry);
      }
      if (!(body.value.pagination?.hasNext ?? items.length >= PAGE_SIZE) || items.length === 0) {
        truncated = false;
        break;
      }
    }
    const stillGoing = Object.entries(counts)
      .filter(([s]) => PENDING.has(s))
      .reduce((sum, [, n]) => sum + n, 0);
    return jsonResult({
      done: !truncated && stillGoing === 0,
      total,
      counts,
      pending,
      failed,
      ...(truncated ? { truncated: true, note: `Counted the first ${MAX_PAGES * PAGE_SIZE} records only.` } : {}),
      ...(total === 0 ? { note: "The collection has no records yet." } : {}),
    });
  },
};
