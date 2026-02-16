import * as z from "zod";
export type GetFilterFieldOptionsRequest = {
    connectorId: string;
    filterKey: string;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
};
export declare const GetFilterFieldOptionsRequest$zodSchema: z.ZodType<GetFilterFieldOptionsRequest>;
export type GetFilterFieldOptionsOption = {
    id?: string | undefined;
    value?: string | undefined;
    label?: string | undefined;
};
export declare const GetFilterFieldOptionsOption$zodSchema: z.ZodType<GetFilterFieldOptionsOption>;
export type GetFilterFieldOptionsPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    hasMore?: boolean | undefined;
    cursor?: string | undefined;
};
export declare const GetFilterFieldOptionsPagination$zodSchema: z.ZodType<GetFilterFieldOptionsPagination>;
/**
 * Options retrieved
 */
export type GetFilterFieldOptionsResponse = {
    success?: boolean | undefined;
    options?: Array<GetFilterFieldOptionsOption> | undefined;
    pagination?: GetFilterFieldOptionsPagination | undefined;
};
export declare const GetFilterFieldOptionsResponse$zodSchema: z.ZodType<GetFilterFieldOptionsResponse>;
//# sourceMappingURL=getfilterfieldoptionsop.d.ts.map