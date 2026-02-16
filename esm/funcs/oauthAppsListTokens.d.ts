import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListOAuthAppTokensRequest } from "../models/listoauthapptokensop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List app tokens
 *
 * @remarks
 * List all active tokens issued to an OAuth app.
 * <br><br>
 * Useful for monitoring app usage and identifying tokens to revoke.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 */
export declare function oauthAppsListTokens(client$: PipeshubCore, request: ListOAuthAppTokensRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthAppsListTokens.d.ts.map