import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ActivateOAuthAppRequest } from "../models/activateoauthappop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Activate suspended OAuth app
 *
 * @remarks
 * Reactivate a suspended OAuth app, allowing it to authenticate and issue tokens again.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oAuthAppsActivateOAuthApp(client$: PipeshubCore, request: ActivateOAuthAppRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthAppsActivateOAuthApp.d.ts.map