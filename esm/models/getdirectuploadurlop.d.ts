import * as z from "zod";
export type GetDirectUploadUrlRequest = {
    documentId: string;
};
export declare const GetDirectUploadUrlRequest$zodSchema: z.ZodType<GetDirectUploadUrlRequest>;
/**
 * Direct upload URL generated successfully
 */
export type GetDirectUploadUrlResponse = {
    success?: boolean | undefined;
    signedUrl?: string | undefined;
    documentId?: string | undefined;
};
export declare const GetDirectUploadUrlResponse$zodSchema: z.ZodType<GetDirectUploadUrlResponse>;
//# sourceMappingURL=getdirectuploadurlop.d.ts.map