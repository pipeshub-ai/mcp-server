import * as z from "zod";
/**
 * Request payload
 */
export type ReindexRecordRequestBody = {
    depth?: number | undefined;
};
export declare const ReindexRecordRequestBody$zodSchema: z.ZodType<ReindexRecordRequestBody>;
export type ReindexRecordRequest = {
    recordId: string;
    body?: ReindexRecordRequestBody | undefined;
};
export declare const ReindexRecordRequest$zodSchema: z.ZodType<ReindexRecordRequest>;
//# sourceMappingURL=reindexrecordop.d.ts.map