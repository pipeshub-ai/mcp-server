import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ResetPasswordWithTokenSecurity } from "../models/resetpasswordwithtokenop.js";
import { TokenPasswordResetRequest } from "../models/tokenpasswordresetrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reset password with email token
 *
 * @remarks
 * Reset password using a token received via email from the forgot password flow.
 * <br><br>
 * <b>Password Requirements:</b><br>
 * - Minimum 8 characters<br>
 * - At least 1 uppercase letter<br>
 * - At least 1 lowercase letter<br>
 * - At least 1 number<br>
 * - At least 1 special character (#?!@$%^&*-)
 * <br><br>
 * <b>Security Notes:</b><br>
 * - Token is single-use and expires after a set time<br>
 * - A new access token is returned upon successful reset
 */
export declare function userAccountsResetPasswordWithToken(client$: PipeshubCore, security: ResetPasswordWithTokenSecurity, request: TokenPasswordResetRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountsResetPasswordWithToken.d.ts.map