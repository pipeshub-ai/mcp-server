import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateSmtpConfigSecurity } from "../models/updatesmtpconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reload SMTP configuration
 *
 * @remarks
 * Dynamically reload the SMTP configuration from the application config file without restarting the service.<br><br>
 *
 * <b>Overview:</b><br>
 * This internal endpoint allows the mail service to pick up SMTP configuration changes at runtime.
 * When SMTP settings are updated via <code>/configurationManager/smtpConfig</code>, this endpoint
 * should be called to apply the changes to the running mail service.<br><br>
 *
 * <b>Authentication:</b><br>
 * Requires a scoped token with <code>fetch:config</code> scope. This endpoint is designed for
 * internal service communication only.<br><br>
 *
 * <b>How It Works:</b><br>
 * <ol>
 * <li>Reads the latest configuration from the config file/etcd</li>
 * <li>Rebinds the AppConfig in the dependency injection container</li>
 * <li>Creates a new MailController instance with updated config</li>
 * <li>Returns the new SMTP configuration (excluding password)</li>
 * </ol>
 *
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Apply SMTP configuration changes without service restart</li>
 * <li>Switch SMTP providers at runtime</li>
 * <li>Update SMTP credentials</li>
 * <li>Change sender email address</li>
 * </ul>
 *
 * <b>Related Endpoints:</b><br>
 * <ul>
 * <li><code>POST /configurationManager/smtpConfig</code> - Create/update SMTP configuration</li>
 * <li><code>GET /configurationManager/smtpConfig</code> - Get current SMTP configuration</li>
 * </ul>
 */
export declare function mailConfigurationReloadSmtp(client$: PipeshubCore, security: UpdateSmtpConfigSecurity, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=mailConfigurationReloadSmtp.d.ts.map