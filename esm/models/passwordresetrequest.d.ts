import * as z from "zod";
/**
 * Request to reset password for authenticated user
 */
export type PasswordResetRequest = {
    currentPassword: string;
    newPassword: string;
    cfTurnstileResponse?: string | undefined;
};
export declare const PasswordResetRequest$zodSchema: z.ZodType<PasswordResetRequest>;
//# sourceMappingURL=passwordresetrequest.d.ts.map