
import * as z from "zod";
import { semanticSearchSearch } from "../../funcs/semanticSearchSearch.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  jsonResult,
  readJson,
  resolveSourceScope,
  searchFilters,
  trimSearchHit,
} from "./_helpers.js";

/** Matches the SDK request default (`src/models/semanticsearchrequest.ts`). */
const DEFAULT_LIMIT = 10;

const args = {
  query: z.string().min(1).describe(
    "Natural language query. Vector search across the org's indexed records.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Result limit, passed to the backend as is. Default 10. Use 5–10 when "
      + "you only need a `recordId`.",
  ),
  apps: z.array(z.string()).optional().describe(
    "Connector ids to search (for example a Jira or Google Drive connection). "
      + "Get them from `pipeshub_sources`, where `kind` is \"connector\". "
      + "Collection ids go in `kb`, not here.",
  ),
  kb: z.array(z.string()).optional().describe(
    "Collection (knowledge base) ids to search. Get them from "
      + "`pipeshub_sources`, where `kind` is \"knowledgeBase\".",
  ),
};

export const tool$pipeshubSearch: ToolDefinition<typeof args> = {
  name: "pipeshub_search",
  description:
    `Vector / semantic search across the org's indexed documents.

**Use this when the user wants to LOCATE a document** — by name, topic,
or a phrase to grep for — and to resolve it to a \`recordId\`. For
open-ended questions across many documents, use \`pipeshub_chat\`
instead, which does the retrieval internally and grounds the answer in
citations.

Typical uses:
- Resolve a doc name / topic into a \`recordId\` for
  \`pipeshub_get_record_content\` — step 1 of any full-document task
  (summarize, extract, review, "what does the doc say?").
- Resolve a filename / phrase into a \`recordId\` for
  \`pipeshub_download_record\`.
- Show the user a ranked list of matching files when they ask "find /
  search for X".

Not for structural questions — what is under this epic, which pages are
in this space, what links to this ticket. Ranking by content cannot show
how records relate; use \`pipeshub_get_record_content\` \`mode:"navigate"\`.

**A ranked sample, never a complete list.** Hits are the top-scoring
blocks from the best-matching records — not all blocks of any record, and
not every record that matches. Never count them to answer "how many" /
"all" / "every"; navigate the record group instead, which reports its
real total.

By default it searches everything. To search only some sources, pass
connector ids in \`apps\` and collection ids in \`kb\`.

Each hit is one matching passage, best match first:
\`{ recordId, recordName, score, snippet, mimeType, webUrl, ... }\`.
One record can appear in several hits. Link a record by its \`webUrl\`.`,
  scopes: ["read"],
  annotations: {
    title: "Semantic search",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const limit = args.limit ?? DEFAULT_LIMIT;
    // Each id is sent in the list the backend reads it from: a collection id
    // in `apps` or a connector id in `kb` is dropped by the backend.
    const { scope, notes } = await resolveSourceScope(
      client,
      args.apps,
      args.kb,
      { signal: ctx.signal },
    );

    const [result] = await semanticSearchSearch(client, {
      query: args.query,
      limit,
      filters: searchFilters(scope),
    }, { fetchOptions: { signal: ctx.signal } }).$inspect();
    if (!result.ok) return errorResult(result.error.message);

    const parsed = await readJson<{
      searchId: string;
      searchResponse: {
        searchResults: any[];
        records?: any[];
        status?: string;
        message?: string;
      };
    }>(result.value, "PipesHub search");
    if (!parsed.ok) return parsed.result;

    const sr = parsed.value.searchResponse ?? {};
    return jsonResult({
      searchId: parsed.value.searchId,
      hits: (sr.searchResults ?? []).map(trimSearchHit),
      uniqueRecords: (sr.records ?? []).map((r: any) => ({
        recordId: r._key,
        recordName: r.recordName,
        connector: r.connectorName,
        mimeType: r.mimeType,
        webUrl: r.webUrl,
      })),
      ...(notes.length > 0 ? { notes } : {}),
    });
  },
};
