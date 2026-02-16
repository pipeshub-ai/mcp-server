import * as z from "zod";
import { AuthError } from "./autherror.js";
/**
 * OTP generated and sent successfully
 */
export type GenerateLoginOtpResponseBody = {
    message?: string | undefined;
};
export declare const GenerateLoginOtpResponseBody$zodSchema: z.ZodType<GenerateLoginOtpResponseBody>;
export type GenerateLoginOtpResponse = GenerateLoginOtpResponseBody | AuthError;
export declare const GenerateLoginOtpResponse$zodSchema: z.ZodType<GenerateLoginOtpResponse>;
//# sourceMappingURL=generateloginotpop.d.ts.map