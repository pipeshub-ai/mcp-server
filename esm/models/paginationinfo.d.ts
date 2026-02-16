import * as z from "zod";
export type PaginationInfo = {
    page?: number | undefined;
    limit?: number | undefined;
    totalCount?: number | undefined;
    totalPages?: number | undefined;
};
export declare const PaginationInfo$zodSchema: z.ZodType<PaginationInfo>;
//# sourceMappingURL=paginationinfo.d.ts.map