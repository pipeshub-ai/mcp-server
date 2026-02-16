import * as z from "zod";
export type DownloadDocumentRequest = {
    documentId: string;
    version?: number | undefined;
    expirationTimeInSeconds?: number | undefined;
};
export declare const DownloadDocumentRequest$zodSchema: z.ZodType<DownloadDocumentRequest>;
/**
 * Download URL generated or file stream
 */
export type DownloadDocumentResponseBody = {
    success?: boolean | undefined;
    signedUrl?: string | undefined;
};
export declare const DownloadDocumentResponseBody$zodSchema: z.ZodType<DownloadDocumentResponseBody>;
export type DownloadDocumentResponse = DownloadDocumentResponseBody | Uint8Array | string;
export declare const DownloadDocumentResponse$zodSchema: z.ZodType<DownloadDocumentResponse>;
//# sourceMappingURL=downloaddocumentop.d.ts.map