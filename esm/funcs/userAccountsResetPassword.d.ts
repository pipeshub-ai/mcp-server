import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { PasswordResetRequest } from "../models/passwordresetrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reset password (authenticated user)
 *
 * @remarks
 * Reset password for an authenticated user. Requires the current password for verification.
 * <br><br>
 * <b>Password Requirements:</b><br>
 * - Minimum 8 characters<br>
 * - At least 1 uppercase letter (A-Z)<br>
 * - At least 1 lowercase letter (a-z)<br>
 * - At least 1 number (0-9)<br>
 * - At least 1 special character (#?!@$%^&*-)
 * <br><br>
 * <b>Security Notes:</b><br>
 * - A new access token is returned (old tokens are invalidated)<br>
 * - CAPTCHA may be required if enabled (pass <code>cf-turnstile-response</code>)
 */
export declare function userAccountsResetPassword(client$: PipeshubCore, request: PasswordResetRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountsResetPassword.d.ts.map