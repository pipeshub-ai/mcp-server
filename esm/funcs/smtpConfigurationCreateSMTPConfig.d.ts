import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SMTPConfig } from "../models/smtpconfig.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create or update SMTP configuration
 *
 * @remarks
 * Configure SMTP email server for sending system emails including user invitations, notifications, and password resets.
 *
 * Common SMTP providers and their settings:
 * - Gmail: host=smtp.gmail.com, port=587 (requires App Password)
 * - SendGrid: host=smtp.sendgrid.net, port=587
 * - Amazon SES: host=email-smtp.{region}.amazonaws.com, port=587
 * - Microsoft 365: host=smtp.office365.com, port=587
 *
 * Configuration is encrypted before storage.
 */
export declare function smtpConfigurationCreateSMTPConfig(client$: PipeshubCore, request: SMTPConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=smtpConfigurationCreateSMTPConfig.d.ts.map