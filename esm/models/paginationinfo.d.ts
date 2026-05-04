import * as z from "zod";
/**
 * Standard pagination block returned alongside list responses
 *
 * @remarks
 * (e.g. `{ items: [...], pagination: PaginationInfo }`).
 */
export type PaginationInfo = {
    page?: number | undefined;
    limit?: number | undefined;
    totalCount?: number | undefined;
    totalPages?: number | undefined;
    hasNextPage?: boolean | undefined;
    hasPrevPage?: boolean | undefined;
};
export declare const PaginationInfo$zodSchema: z.ZodType<PaginationInfo>;
//# sourceMappingURL=paginationinfo.d.ts.map