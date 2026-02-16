import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const UploadResultStatus: {
    readonly Success: "success";
    readonly Failed: "failed";
};
export type UploadResultStatus = ClosedEnum<typeof UploadResultStatus>;
export declare const UploadResultStatus$zodSchema: z.ZodEnum<{
    success: "success";
    failed: "failed";
}>;
export type UploadResult1 = {
    recordId?: string | undefined;
    recordName?: string | undefined;
    status?: UploadResultStatus | undefined;
    error?: string | undefined;
};
export declare const UploadResult1$zodSchema: z.ZodType<UploadResult1>;
/**
 * Result of a file upload operation
 */
export type UploadResult = {
    message?: string | undefined;
    uploadResults?: Array<UploadResult1> | undefined;
};
export declare const UploadResult$zodSchema: z.ZodType<UploadResult>;
//# sourceMappingURL=uploadresult.d.ts.map