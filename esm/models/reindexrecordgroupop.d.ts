import * as z from "zod";
/**
 * Request payload
 */
export type ReindexRecordGroupRequestBody = {
    depth?: number | undefined;
};
export declare const ReindexRecordGroupRequestBody$zodSchema: z.ZodType<ReindexRecordGroupRequestBody>;
export type ReindexRecordGroupRequest = {
    recordGroupId: string;
    body?: ReindexRecordGroupRequestBody | undefined;
};
export declare const ReindexRecordGroupRequest$zodSchema: z.ZodType<ReindexRecordGroupRequest>;
//# sourceMappingURL=reindexrecordgroupop.d.ts.map