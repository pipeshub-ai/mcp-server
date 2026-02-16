import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { AccountCreationTemplateData } from "./accountcreationtemplatedata.js";
import { AppUserInviteTemplateData } from "./appuserinvitetemplatedata.js";
import { LoginWithOTPTemplateData } from "./loginwithotptemplatedata.js";
import { ResetPasswordTemplateData } from "./resetpasswordtemplatedata.js";
import { SuspiciousLoginTemplateData } from "./suspiciouslogintemplatedata.js";
/**
 * Type of email template to use. Each template has specific `templateData` requirements:
 *
 * @remarks
 * - `loginWithOTP`: OTP authentication email
 * - `resetPassword`: Password reset link email
 * - `accountCreation`: Welcome email for new organizations
 * - `appuserInvite`: Invitation email to join an organization
 * - `suspiciousLoginAttempt`: Security alert for multiple failed OTP attempts
 */
export declare const EmailTemplateType: {
    readonly LoginWithOTP: "loginWithOTP";
    readonly ResetPassword: "resetPassword";
    readonly AccountCreation: "accountCreation";
    readonly AppuserInvite: "appuserInvite";
    readonly SuspiciousLoginAttempt: "suspiciousLoginAttempt";
};
/**
 * Type of email template to use. Each template has specific `templateData` requirements:
 *
 * @remarks
 * - `loginWithOTP`: OTP authentication email
 * - `resetPassword`: Password reset link email
 * - `accountCreation`: Welcome email for new organizations
 * - `appuserInvite`: Invitation email to join an organization
 * - `suspiciousLoginAttempt`: Security alert for multiple failed OTP attempts
 */
export type EmailTemplateType = ClosedEnum<typeof EmailTemplateType>;
export declare const EmailTemplateType$zodSchema: z.ZodEnum<{
    loginWithOTP: "loginWithOTP";
    resetPassword: "resetPassword";
    accountCreation: "accountCreation";
    appuserInvite: "appuserInvite";
    suspiciousLoginAttempt: "suspiciousLoginAttempt";
}>;
/**
 * Dynamic data to populate the email template. Required fields depend on <code>emailTemplateType</code>.<br><br>
 *
 * @remarks
 * <b>Template Data Requirements:</b><br>
 * <ul>
 * <li><b>loginWithOTP:</b> See <code>LoginWithOTPTemplateData</code> - requires <code>name</code>, <code>otp</code></li>
 * <li><b>resetPassword:</b> See <code>ResetPasswordTemplateData</code> - requires <code>name</code>, <code>link</code></li>
 * <li><b>accountCreation:</b> See <code>AccountCreationTemplateData</code> - requires <code>orgName</code>, <code>link</code></li>
 * <li><b>appuserInvite:</b> See <code>AppUserInviteTemplateData</code> - requires <code>invitee</code>, <code>orgName</code>, <code>link</code></li>
 * <li><b>suspiciousLoginAttempt:</b> See <code>SuspiciousLoginTemplateData</code> - requires <code>link</code></li>
 * </ul>
 */
export type TemplateData = AppUserInviteTemplateData | LoginWithOTPTemplateData | ResetPasswordTemplateData | AccountCreationTemplateData | SuspiciousLoginTemplateData;
export declare const TemplateData$zodSchema: z.ZodType<TemplateData>;
export type Attachment = {
    filename?: string | undefined;
    content?: string | undefined;
    contentType?: string | undefined;
};
export declare const Attachment$zodSchema: z.ZodType<Attachment>;
/**
 * Request body for sending transactional emails via pre-defined templates.
 *
 * @remarks
 *
 * **Template-specific templateData requirements:**
 *
 * | Template | Required Fields | Description |
 * |----------|----------------|-------------|
 * | `loginWithOTP` | `name`, `otp` | User's name and 6-digit OTP code |
 * | `resetPassword` | `name`, `link` | User's name and password reset URL |
 * | `accountCreation` | `orgName`, `link` | Organization name and login URL |
 * | `appuserInvite` | `invitee`, `orgName`, `link` | Inviter name, org name, and invitation URL |
 * | `suspiciousLoginAttempt` | `link` | Support contact URL |
 *
 * **Note:** The actual "From" address is taken from the SMTP configuration, not from `fromEmailDomain`.
 * The `fromEmailDomain` field is stored for audit purposes only.
 */
export type MailBody = {
    productName?: string | undefined;
    emailTemplateType: EmailTemplateType;
    isAutoEmail?: boolean | undefined;
    fromEmailDomain?: string | undefined;
    sendEmailTo: Array<string>;
    subject?: string | undefined;
    templateData?: AppUserInviteTemplateData | LoginWithOTPTemplateData | ResetPasswordTemplateData | AccountCreationTemplateData | SuspiciousLoginTemplateData | undefined;
    sendCcTo?: Array<string> | undefined;
    attachments?: Array<Attachment> | undefined;
};
export declare const MailBody$zodSchema: z.ZodType<MailBody>;
//# sourceMappingURL=mailbody.d.ts.map