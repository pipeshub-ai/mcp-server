import * as z from "zod";
/**
 * Target parent folder for the record
 */
export type MoveRecordRequestBody = {
    newParentId: string | null;
};
export declare const MoveRecordRequestBody$zodSchema: z.ZodType<MoveRecordRequestBody>;
export type MoveRecordRequest = {
    kbId: string;
    recordId: string;
    body: MoveRecordRequestBody;
};
export declare const MoveRecordRequest$zodSchema: z.ZodType<MoveRecordRequest>;
//# sourceMappingURL=moverecordop.d.ts.map