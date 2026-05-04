import * as z from "zod";
import { SemanticSearchFilters } from "./semanticsearchfilters.js";
/**
 * Request body for `POST /search`. Performs a semantic vector search
 *
 * @remarks
 * across the caller's organization and persists a search record that
 * can later be retrieved via `GET /search/{searchId}`.<br><br>
 * <b>How Semantic Search Works:</b><br>
 * <ol>
 * <li>Query is converted to vector embeddings</li>
 * <li>Similar content is found using vector similarity</li>
 * <li>Results are ranked by relevance score</li>
 * <li>Matching chunks with metadata are returned</li>
 * </ol>
 * <b>Filtering:</b> Use `filters` to narrow scope by connector,
 * knowledge base, department, module, or record type. See
 * `SemanticSearchFilters`.<br><br>
 * <b>Notes for programmatic / MCP callers:</b><br>
 * <ul>
 * <li>To resolve a filename or topic to a downloadable record, call
 *     this endpoint and read
 *     <code>searchResponse.searchResults[*].metadata.recordId</code>
 *     (or any key of <code>searchResponse.virtual_to_record_map</code>).
 *     Then pass that id to
 *     <code>GET /knowledgeBase/stream/record/{recordId}</code>.</li>
 * <li>Use <code>limit</code> aggressively (5–10) when searching just to
 *     resolve a record id; raise it only when you need ranked snippets.</li>
 * </ul>
 */
export type SemanticSearchRequest = {
    query: string;
    filters?: SemanticSearchFilters | undefined;
    limit?: number | undefined;
    modelKey?: string | undefined;
    modelName?: string | undefined;
    modelFriendlyName?: string | undefined;
    chatMode?: string | undefined;
};
export declare const SemanticSearchRequest$zodSchema: z.ZodType<SemanticSearchRequest>;
//# sourceMappingURL=semanticsearchrequest.d.ts.map