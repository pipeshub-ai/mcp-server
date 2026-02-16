import * as z from "zod";
/**
 * Request to send password reset email
 */
export type ForgotPasswordRequest = {
    email: string;
    cfTurnstileResponse?: string | undefined;
};
export declare const ForgotPasswordRequest$zodSchema: z.ZodType<ForgotPasswordRequest>;
//# sourceMappingURL=forgotpasswordrequest.d.ts.map