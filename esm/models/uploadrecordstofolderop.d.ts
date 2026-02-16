import * as z from "zod";
export type UploadRecordsToFolderFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UploadRecordsToFolderFile$zodSchema: z.ZodType<UploadRecordsToFolderFile>;
/**
 * Request payload
 */
export type UploadRecordsToFolderRequestBody = {
    files: Array<UploadRecordsToFolderFile>;
    files_metadata?: string | undefined;
    isVersioned?: boolean | undefined;
};
export declare const UploadRecordsToFolderRequestBody$zodSchema: z.ZodType<UploadRecordsToFolderRequestBody>;
export type UploadRecordsToFolderRequest = {
    kbId: string;
    folderId: string;
    body: UploadRecordsToFolderRequestBody;
};
export declare const UploadRecordsToFolderRequest$zodSchema: z.ZodType<UploadRecordsToFolderRequest>;
//# sourceMappingURL=uploadrecordstofolderop.d.ts.map