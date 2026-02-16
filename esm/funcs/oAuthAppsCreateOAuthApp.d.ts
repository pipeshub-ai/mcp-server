import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateOAuthAppRequest } from "../models/createoauthapprequest.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create OAuth app
 *
 * @remarks
 * Create a new OAuth app for the organization.
 * <br><br>
 * <b>Important:</b> The client secret is only returned once during creation.
 * Store it securely - it cannot be retrieved later. If lost, you'll need to
 * regenerate it.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oAuthAppsCreateOAuthApp(client$: PipeshubCore, request: CreateOAuthAppRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthAppsCreateOAuthApp.d.ts.map