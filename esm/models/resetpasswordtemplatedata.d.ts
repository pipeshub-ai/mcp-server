import * as z from "zod";
/**
 * Template data for password reset email
 */
export type ResetPasswordTemplateData = {
    name: string;
    link: string;
};
export declare const ResetPasswordTemplateData$zodSchema: z.ZodType<ResetPasswordTemplateData>;
//# sourceMappingURL=resetpasswordtemplatedata.d.ts.map