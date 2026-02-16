import * as z from "zod";
/**
 * SMTP email server configuration for sending system emails (invitations, notifications, password resets)
 */
export type SMTPConfig = {
    host: string;
    port: number;
    username?: string | undefined;
    password?: string | undefined;
    fromEmail: string;
};
export declare const SMTPConfig$zodSchema: z.ZodType<SMTPConfig>;
//# sourceMappingURL=smtpconfig.d.ts.map