import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { InitAuthRequest } from "../models/initauthrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Initialize authentication session
 *
 * @remarks
 * Initialize an authentication session for a user by email address.
 * This is the first step in the multi-step authentication flow.
 * <br><br>
 * <b>Flow:</b><br>
 * 1. Call this endpoint with the user's email<br>
 * 2. Receive a session token in the <code>x-session-token</code> response header<br>
 * 3. Use the session token in subsequent <code>/authenticate</code> calls<br>
 * 4. The response includes <code>allowedMethods</code> for the first authentication step
 * <br><br>
 * <b>Session Token:</b><br>
 * - Stored in response header <code>x-session-token</code><br>
 * - Required for all subsequent authentication requests<br>
 * - Expires after a configured timeout period
 * <br><br>
 * <b>Multi-Factor Authentication:</b><br>
 * If the organization has MFA configured, you'll need to complete multiple
 * authentication steps. Each step completion returns the next step's allowed methods.
 */
export declare function userAccountInitAuth(client$: PipeshubCore, request: InitAuthRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountInitAuth.d.ts.map