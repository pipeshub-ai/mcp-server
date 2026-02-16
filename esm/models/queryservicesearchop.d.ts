import * as z from "zod";
export declare const QueryServiceSearchOpServerList: readonly ["http://localhost:8000"];
/**
 * Optional filters (e.g., kb IDs)
 */
export type QueryServiceSearchFilters = {
    kb?: Array<string> | undefined;
};
export declare const QueryServiceSearchFilters$zodSchema: z.ZodType<QueryServiceSearchFilters>;
/**
 * Request payload
 */
export type QueryServiceSearchRequest = {
    query: string;
    limit?: number | undefined;
    filters?: QueryServiceSearchFilters | undefined;
};
export declare const QueryServiceSearchRequest$zodSchema: z.ZodType<QueryServiceSearchRequest>;
export type QueryServiceSearchSearchResult = {};
export declare const QueryServiceSearchSearchResult$zodSchema: z.ZodType<QueryServiceSearchSearchResult>;
/**
 * Search results retrieved
 */
export type QueryServiceSearchResponse = {
    searchResults?: Array<QueryServiceSearchSearchResult> | undefined;
    status_code?: number | undefined;
};
export declare const QueryServiceSearchResponse$zodSchema: z.ZodType<QueryServiceSearchResponse>;
//# sourceMappingURL=queryservicesearchop.d.ts.map