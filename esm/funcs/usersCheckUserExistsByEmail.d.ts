import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckUserExistsByEmailRequest, CheckUserExistsByEmailSecurity } from "../models/checkuserexistsbyemailop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check if user exists by email
 *
 * @remarks
 * Check if a user account exists with the given email address. Used for pre-validation in registration and invitation flows.<br><br>
 * <b>Overview:</b><br>
 * This internal service endpoint validates email existence before creating accounts or sending invitations. It helps prevent duplicate accounts and validates recovery email addresses.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Pre-flight check before user invitation</li>
 * <li>Email validation during registration</li>
 * <li>Account recovery flow validation</li>
 * <li>Duplicate prevention checks</li>
 * </ul>
 * <b>Security Model:</b><br>
 * <ul>
 * <li>Requires scoped token with USER_LOOKUP privilege</li>
 * <li>Not accessible with regular bearer tokens</li>
 * <li>Typically called from internal services only</li>
 * </ul>
 * <b>Response Behavior:</b><br>
 * <ul>
 * <li>Returns matching users (including soft-deleted for recovery)</li>
 * <li>Empty array if no match found</li>
 * <li>Does not expose whether email exists to prevent enumeration</li>
 * </ul>
 * <b>Note:</b> May return soft-deleted users to support account recovery workflows.
 */
export declare function usersCheckUserExistsByEmail(client$: PipeshubCore, security: CheckUserExistsByEmailSecurity, request: CheckUserExistsByEmailRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersCheckUserExistsByEmail.d.ts.map