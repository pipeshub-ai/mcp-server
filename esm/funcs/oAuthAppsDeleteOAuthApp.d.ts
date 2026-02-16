import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteOAuthAppRequest } from "../models/deleteoauthappop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete OAuth app
 *
 * @remarks
 * Delete (soft delete) an OAuth app.
 * <br><br>
 * This marks the app as deleted and revokes all its tokens.
 * The app cannot be restored after deletion.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oAuthAppsDeleteOAuthApp(client$: PipeshubCore, request: DeleteOAuthAppRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthAppsDeleteOAuthApp.d.ts.map