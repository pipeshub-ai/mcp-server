import * as z from "zod";
/**
 * Template data for OTP login email
 */
export type LoginWithOTPTemplateData = {
    name: string;
    otp: string;
};
export declare const LoginWithOTPTemplateData$zodSchema: z.ZodType<LoginWithOTPTemplateData>;
//# sourceMappingURL=loginwithotptemplatedata.d.ts.map