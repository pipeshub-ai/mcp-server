import * as z from "zod";
export type UpdateDocumentBufferFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UpdateDocumentBufferFile$zodSchema: z.ZodType<UpdateDocumentBufferFile>;
/**
 * Request payload
 */
export type UpdateDocumentBufferRequestBody = {
    file: UpdateDocumentBufferFile | Blob;
};
export declare const UpdateDocumentBufferRequestBody$zodSchema: z.ZodType<UpdateDocumentBufferRequestBody>;
export type UpdateDocumentBufferRequest = {
    documentId: string;
    body: UpdateDocumentBufferRequestBody;
};
export declare const UpdateDocumentBufferRequest$zodSchema: z.ZodType<UpdateDocumentBufferRequest>;
/**
 * Buffer updated successfully
 */
export type UpdateDocumentBufferResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const UpdateDocumentBufferResponse$zodSchema: z.ZodType<UpdateDocumentBufferResponse>;
//# sourceMappingURL=updatedocumentbufferop.d.ts.map