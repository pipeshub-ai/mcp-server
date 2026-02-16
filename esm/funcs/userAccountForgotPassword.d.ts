import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ForgotPasswordRequest } from "../models/forgotpasswordrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Request password reset email
 *
 * @remarks
 * Send a password reset link to the user's email.
 * The link contains a time-limited token that can be used to reset the password.
 * <br><br>
 * <b>Note:</b> This endpoint always returns 200 even if the email doesn't exist (to prevent email enumeration).
 */
export declare function userAccountForgotPassword(client$: PipeshubCore, request: ForgotPasswordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountForgotPassword.d.ts.map