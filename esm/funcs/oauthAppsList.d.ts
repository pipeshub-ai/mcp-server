import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListOAuthAppsRequest } from "../models/listoauthappsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List OAuth apps
 *
 * @remarks
 * List all OAuth apps registered for the organization.
 * <br><br>
 * Returns a paginated list of apps with their configuration (excluding secrets).
 * <br><br>
 * <b>Filters:</b><br>
 * - `status` - Filter by app status (active, suspended, revoked)<br>
 * - `search` - Search by app name
 */
export declare function oauthAppsList(client$: PipeshubCore, request?: ListOAuthAppsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthAppsList.d.ts.map