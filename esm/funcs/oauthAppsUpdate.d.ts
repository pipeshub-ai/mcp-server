import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateOAuthAppRequestRequest } from "../models/updateoauthappop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update OAuth app
 *
 * @remarks
 * Update an OAuth app's configuration.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 * <br><br>
 * <b>Note:</b> To regenerate the client secret, use the
 * `/oauth-clients/{appId}/regenerate-secret` endpoint.
 */
export declare function oauthAppsUpdate(client$: PipeshubCore, request: UpdateOAuthAppRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthAppsUpdate.d.ts.map