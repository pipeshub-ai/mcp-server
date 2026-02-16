import * as z from "zod";
/**
 * Reference to a source document cited in a response
 */
export type CitationReference = {
    citationId?: string | undefined;
    relevanceScore?: number | undefined;
    excerpt?: string | undefined;
    context?: string | undefined;
};
export declare const CitationReference$zodSchema: z.ZodType<CitationReference>;
//# sourceMappingURL=citationreference.d.ts.map