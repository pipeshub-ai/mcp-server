import * as z from "zod";
import { RecordT } from "./record.js";
export type UpdateRecordFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UpdateRecordFile$zodSchema: z.ZodType<UpdateRecordFile>;
/**
 * Request payload
 */
export type UpdateRecordRequestBody = {
    recordName?: string | undefined;
    file?: UpdateRecordFile | Blob | undefined;
};
export declare const UpdateRecordRequestBody$zodSchema: z.ZodType<UpdateRecordRequestBody>;
export type UpdateRecordRequest = {
    recordId: string;
    body?: UpdateRecordRequestBody | undefined;
};
export declare const UpdateRecordRequest$zodSchema: z.ZodType<UpdateRecordRequest>;
/**
 * Record updated successfully
 */
export type UpdateRecordResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    record?: RecordT | undefined;
};
export declare const UpdateRecordResponse$zodSchema: z.ZodType<UpdateRecordResponse>;
//# sourceMappingURL=updaterecordop.d.ts.map