import * as z from "zod";
/**
 * Response after successful password reset
 */
export type PasswordResetResponse = {
    data?: string | undefined;
    accessToken?: string | undefined;
};
export declare const PasswordResetResponse$zodSchema: z.ZodType<PasswordResetResponse>;
//# sourceMappingURL=passwordresetresponse.d.ts.map