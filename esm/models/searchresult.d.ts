import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { SearchResultItem } from "./searchresultitem.js";
export declare const SearchResultAccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
export type SearchResultAccessLevel = ClosedEnum<typeof SearchResultAccessLevel>;
export declare const SearchResultAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
export type SearchResultSharedWith = {
    userId?: string | undefined;
    accessLevel?: SearchResultAccessLevel | undefined;
};
export declare const SearchResultSharedWith$zodSchema: z.ZodType<SearchResultSharedWith>;
/**
 * Result of a semantic search operation, containing matching
 *
 * @remarks
 * document chunks with relevance scores.
 */
export type SearchResult = {
    _id?: string | undefined;
    searchId?: string | undefined;
    query?: string | undefined;
    results?: Array<SearchResultItem> | undefined;
    records?: {
        [k: string]: string;
    } | undefined;
    userId?: string | undefined;
    orgId?: string | undefined;
    isShared?: boolean | undefined;
    sharedWith?: Array<SearchResultSharedWith> | undefined;
    isArchived?: boolean | undefined;
    createdAt?: string | undefined;
};
export declare const SearchResult$zodSchema: z.ZodType<SearchResult>;
//# sourceMappingURL=searchresult.d.ts.map