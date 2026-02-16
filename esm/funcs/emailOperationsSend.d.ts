import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { MailBody } from "../models/mailbody.js";
import { SendEmailSecurity } from "../models/sendemailop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Send a transactional email
 *
 * @remarks
 * Send a transactional email using the configured SMTP server with a pre-defined template.<br><br>
 *
 * <b>Overview:</b><br>
 * This is an internal service endpoint used by other PipesHub services to send transactional emails.
 * It uses Handlebars templates to generate HTML emails with dynamic content. All sent emails are
 * logged to the database for audit purposes.<br><br>
 *
 * <b>Authentication:</b><br>
 * Requires a scoped token with <code>mail:send</code> scope. This endpoint is not accessible
 * with regular user JWT tokens - it is designed for service-to-service communication only.<br><br>
 *
 * <b>Available Templates:</b><br>
 * <ul>
 * <li><b>loginWithOTP</b> - Send OTP code for user authentication. Requires: <code>name</code>, <code>otp</code></li>
 * <li><b>resetPassword</b> - Password reset link. Requires: <code>name</code>, <code>link</code></li>
 * <li><b>accountCreation</b> - Welcome email for new organizations. Requires: <code>orgName</code>, <code>link</code></li>
 * <li><b>appuserInvite</b> - Invitation to join organization. Requires: <code>invitee</code>, <code>orgName</code>, <code>link</code></li>
 * <li><b>suspiciousLoginAttempt</b> - Security alert. Requires: <code>link</code></li>
 * </ul>
 *
 * <b>Email Delivery Flow:</b><br>
 * <ol>
 * <li>Validate SMTP configuration exists (middleware check)</li>
 * <li>Validate scoped token has <code>mail:send</code> scope</li>
 * <li>Select and compile Handlebars template with provided data</li>
 * <li>Send email via nodemailer using SMTP configuration</li>
 * <li>Log email metadata to MongoDB (subject, from, to, cc, templateType)</li>
 * </ol>
 *
 * <b>Important Notes:</b><br>
 * <ul>
 * <li>The "From" address is always taken from SMTP config, not the request body</li>
 * <li>Failed email sends return 500 with error details</li>
 * <li>Template mismatches throw "Unknown Template" error</li>
 * <li>SMTP must be configured before using this endpoint</li>
 * </ul>
 *
 * <b>Related Endpoints:</b><br>
 * <ul>
 * <li><code>POST /configurationManager/smtpConfig</code> - Configure SMTP server</li>
 * <li><code>POST /mail/updateSmtpConfig</code> - Reload SMTP configuration at runtime</li>
 * </ul>
 */
export declare function emailOperationsSend(client$: PipeshubCore, security: SendEmailSecurity, request: MailBody, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=emailOperationsSend.d.ts.map