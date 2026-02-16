import * as z from "zod";
export type UploadRecordsToKBFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UploadRecordsToKBFile$zodSchema: z.ZodType<UploadRecordsToKBFile>;
/**
 * Request payload
 */
export type UploadRecordsToKBRequestBody = {
    files: Array<UploadRecordsToKBFile>;
    files_metadata?: string | undefined;
    isVersioned?: boolean | undefined;
    recordType?: string | undefined;
};
export declare const UploadRecordsToKBRequestBody$zodSchema: z.ZodType<UploadRecordsToKBRequestBody>;
export type UploadRecordsToKBRequest = {
    kbId: string;
    body: UploadRecordsToKBRequestBody;
};
export declare const UploadRecordsToKBRequest$zodSchema: z.ZodType<UploadRecordsToKBRequest>;
//# sourceMappingURL=uploadrecordstokbop.d.ts.map