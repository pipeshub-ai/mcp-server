import * as z from "zod";
/**
 * Upload limits retrieved
 */
export type GetUploadLimitsResponse = {
    maxFilesPerRequest?: number | undefined;
    maxFileSizeBytes?: number | undefined;
};
export declare const GetUploadLimitsResponse$zodSchema: z.ZodType<GetUploadLimitsResponse>;
//# sourceMappingURL=getuploadlimitsop.d.ts.map