import * as z from "zod";
import { Document } from "./document.js";
export type UploadNextVersionFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UploadNextVersionFile$zodSchema: z.ZodType<UploadNextVersionFile>;
/**
 * Request payload
 */
export type UploadNextVersionRequestBody = {
    currentVersionNote?: string | undefined;
    nextVersionNote?: string | undefined;
    file: UploadNextVersionFile | Blob;
};
export declare const UploadNextVersionRequestBody$zodSchema: z.ZodType<UploadNextVersionRequestBody>;
export type UploadNextVersionRequest = {
    documentId: string;
    body: UploadNextVersionRequestBody;
};
export declare const UploadNextVersionRequest$zodSchema: z.ZodType<UploadNextVersionRequest>;
/**
 * New version uploaded successfully
 */
export type UploadNextVersionResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Document | undefined;
};
export declare const UploadNextVersionResponse$zodSchema: z.ZodType<UploadNextVersionResponse>;
//# sourceMappingURL=uploadnextversionop.d.ts.map