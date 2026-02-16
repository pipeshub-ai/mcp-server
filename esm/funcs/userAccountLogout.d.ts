import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Logout current session
 *
 * @remarks
 * Log out the current user session and invalidate tokens.
 * <br><br>
 * <b>Effects:</b><br>
 * - Invalidates the current access token<br>
 * - Clears server-side session data<br>
 * - Client should also clear stored tokens locally
 * <br><br>
 * <b>Note:</b> This endpoint requires the access token, not the refresh token.
 */
export declare function userAccountLogout(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountLogout.d.ts.map