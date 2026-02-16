import * as z from "zod";
import { SearchResult } from "./searchresult.js";
export type SearchHistoryRequest = {
    limit?: number | undefined;
    page?: number | undefined;
};
export declare const SearchHistoryRequest$zodSchema: z.ZodType<SearchHistoryRequest>;
/**
 * Search history with pagination
 */
export type SearchHistoryResponse = {
    results?: Array<SearchResult> | undefined;
    total?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const SearchHistoryResponse$zodSchema: z.ZodType<SearchHistoryResponse>;
//# sourceMappingURL=searchhistoryop.d.ts.map