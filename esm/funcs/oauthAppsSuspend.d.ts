import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SuspendOAuthAppRequest } from "../models/suspendoauthappop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Suspend OAuth app
 *
 * @remarks
 * Suspend an OAuth app, preventing it from authenticating or issuing tokens.
 * <br><br>
 * Existing tokens remain valid until they expire, but no new tokens can
 * be obtained. Use this for temporary access suspension.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oauthAppsSuspend(client$: PipeshubCore, request: SuspendOAuthAppRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthAppsSuspend.d.ts.map