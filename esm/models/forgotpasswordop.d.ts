import * as z from "zod";
/**
 * Password reset email sent successfully (or email not found - same response for security)
 */
export type ForgotPasswordResponse = {
    message?: string | undefined;
};
export declare const ForgotPasswordResponse$zodSchema: z.ZodType<ForgotPasswordResponse>;
//# sourceMappingURL=forgotpasswordop.d.ts.map