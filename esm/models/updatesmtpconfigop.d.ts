import * as z from "zod";
import { SMTPConfig } from "./smtpconfig.js";
export type UpdateSmtpConfigSecurity = {
    scopedToken: string;
};
export declare const UpdateSmtpConfigSecurity$zodSchema: z.ZodType<UpdateSmtpConfigSecurity>;
/**
 * SMTP configuration reloaded successfully
 */
export type UpdateSmtpConfigResponse = {
    message?: string | undefined;
    smtp?: SMTPConfig | undefined;
};
export declare const UpdateSmtpConfigResponse$zodSchema: z.ZodType<UpdateSmtpConfigResponse>;
//# sourceMappingURL=updatesmtpconfigop.d.ts.map