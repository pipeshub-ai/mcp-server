import * as z from "zod";
export type SendEmailSecurity = {
    scopedToken: string;
};
export declare const SendEmailSecurity$zodSchema: z.ZodType<SendEmailSecurity>;
/**
 * Internal server error. Email sending failed due to:<br>
 *
 * @remarks
 * <ul>
 * <li>SMTP server connection failure</li>
 * <li>Authentication failure with SMTP server</li>
 * <li>Template compilation error</li>
 * <li>Network issues</li>
 * </ul>
 */
export type SendEmailInternalServerErrorResponseBody = {
    error?: string | undefined;
};
export declare const SendEmailInternalServerErrorResponseBody$zodSchema: z.ZodType<SendEmailInternalServerErrorResponseBody>;
/**
 * SMTP configuration not found in application config
 */
export type SendEmailNotFoundResponseBody = {
    error?: string | undefined;
};
export declare const SendEmailNotFoundResponseBody$zodSchema: z.ZodType<SendEmailNotFoundResponseBody>;
/**
 * Bad request. Possible reasons:<br>
 *
 * @remarks
 * <ul>
 * <li>SMTP not configured properly (missing host, port, or fromEmail)</li>
 * <li>Invalid or unknown email template type</li>
 * <li>Missing required templateData fields for the selected template</li>
 * <li>Invalid email format in sendEmailTo or sendCcTo</li>
 * </ul>
 */
export type SendEmailBadRequestResponseBody = {
    error?: string | undefined;
};
export declare const SendEmailBadRequestResponseBody$zodSchema: z.ZodType<SendEmailBadRequestResponseBody>;
export type SendEmailData = {
    status?: boolean | undefined;
    data?: string | undefined;
};
export declare const SendEmailData$zodSchema: z.ZodType<SendEmailData>;
/**
 * Email sent successfully and logged to database
 */
export type SendEmailResponseBody = {
    data?: SendEmailData | undefined;
};
export declare const SendEmailResponseBody$zodSchema: z.ZodType<SendEmailResponseBody>;
export type SendEmailResponse = SendEmailResponseBody | SendEmailBadRequestResponseBody | SendEmailNotFoundResponseBody | SendEmailInternalServerErrorResponseBody;
export declare const SendEmailResponse$zodSchema: z.ZodType<SendEmailResponse>;
//# sourceMappingURL=sendemailop.d.ts.map