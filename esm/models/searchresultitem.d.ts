import * as z from "zod";
/**
 * Additional metadata about the source
 */
export type SearchResultItemMetadata = {
    recordId?: string | undefined;
    recordName?: string | undefined;
    connectorName?: string | undefined;
    webUrl?: string | undefined;
    mimeType?: string | undefined;
};
export declare const SearchResultItemMetadata$zodSchema: z.ZodType<SearchResultItemMetadata>;
/**
 * A single matching chunk from semantic search
 */
export type SearchResultItem = {
    content?: string | undefined;
    chunkIndex?: number | undefined;
    citationType?: string | undefined;
    metadata?: SearchResultItemMetadata | undefined;
    score?: number | undefined;
};
export declare const SearchResultItem$zodSchema: z.ZodType<SearchResultItem>;
//# sourceMappingURL=searchresultitem.d.ts.map