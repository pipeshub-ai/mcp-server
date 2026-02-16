import * as z from "zod";
/**
 * Request to generate and send OTP
 */
export type OtpGenerateRequest = {
    email: string;
    cfTurnstileResponse?: string | undefined;
};
export declare const OtpGenerateRequest$zodSchema: z.ZodType<OtpGenerateRequest>;
//# sourceMappingURL=otpgeneraterequest.d.ts.map