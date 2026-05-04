import * as z from "zod";
import { SearchResponsePayload } from "./searchresponsepayload.js";
/**
 * Top-level response from `POST /search`. The search is also persisted
 *
 * @remarks
 * and can later be fetched by `searchId`.
 */
export type SearchResult = {
    searchId: string;
    searchResponse: SearchResponsePayload;
};
export declare const SearchResult$zodSchema: z.ZodType<SearchResult>;
//# sourceMappingURL=searchresult.d.ts.map