import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { AIModelProviderConfig } from "./aimodelproviderconfiginput.js";
export declare const AIModelProviderResponseStatus: {
    readonly Success: "success";
    readonly Error: "error";
};
export type AIModelProviderResponseStatus = ClosedEnum<typeof AIModelProviderResponseStatus>;
export declare const AIModelProviderResponseStatus$zodSchema: z.ZodEnum<{
    success: "success";
    error: "error";
}>;
/**
 * Response containing AI model provider details
 */
export type AIModelProviderResponse = {
    status?: AIModelProviderResponseStatus | undefined;
    message?: string | undefined;
    data?: AIModelProviderConfig | undefined;
};
export declare const AIModelProviderResponse$zodSchema: z.ZodType<AIModelProviderResponse>;
//# sourceMappingURL=aimodelproviderresponse.d.ts.map