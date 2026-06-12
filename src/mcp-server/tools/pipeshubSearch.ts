
import * as z from "zod";
import { semanticSearchSearch } from "../../funcs/semanticSearchSearch.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, jsonResult, readJson, trimSearchHit } from "./_helpers.js";

const args = {
  query: z.string().min(1).describe(
    "Natural language query. Vector search across the org's indexed records.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Max number of result chunks. Default 10. Use a small value (5–10) "
      + "when the goal is to resolve a filename / topic into a recordId.",
  ),
  apps: z.array(z.string()).optional().describe(
    "Source-scoping ids — connector instance UUIDs and / or "
      + "`knowledgeBase_<orgId>`. Get them from `pipeshub_sources`.",
  ),
};

export const tool$pipeshubSearch: ToolDefinition<typeof args> = {
  name: "pipeshub_search",
  description:
    `Vector / semantic search across the org's indexed documents.

**Use this only when the user wants to LOCATE a document** — by name,
topic, or a phrase to grep for. For "what does the document say about
X?" or any open-ended question, use \`pipeshub_chat\` instead, which
does the retrieval internally and grounds the answer in citations.

Typical uses:
- Resolve a filename / phrase into a \`recordId\` for
  \`pipeshub_download_record\`.
- Show the user a ranked list of matching files when they ask "find /
  search for X".

The response is trimmed to one row per hit:
\`{ recordId, recordName, score, snippet, mimeType, webUrl, ... }\`.
Highest \`score\` first; multiple hits may share the same \`recordId\`
(different chunks of the same record).`,
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
    const [result] = await semanticSearchSearch(client, {
      query: args.query,
      limit: args.limit,
      filters: args.apps ? { apps: args.apps, kb: [] } : undefined,
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
    }>(result.value);
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
    });
  },
};
