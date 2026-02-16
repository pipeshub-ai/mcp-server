import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RefreshTokenSecurity } from "../models/refreshtokenop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Refresh access token
 *
 * @remarks
 * Get a new access token using a valid refresh token.
 * <br><br>
 * <b>Usage:</b><br>
 * - Pass the refresh token as a Bearer token in the Authorization header<br>
 * - Returns a new access token (1 hour expiry) and basic user information
 * <br><br>
 * <b>Token Lifetimes:</b><br>
 * - Access token: 1 hour<br>
 * - Refresh token: 7 days
 * <br><br>
 * <b>Best Practices:</b><br>
 * - Call this endpoint before the access token expires<br>
 * - Store the new access token and continue using it for authenticated requests<br>
 * - If refresh fails with 401, redirect user to login flow
 */
export declare function userAccountsRefreshToken(client$: PipeshubCore, security: RefreshTokenSecurity, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountsRefreshToken.d.ts.map