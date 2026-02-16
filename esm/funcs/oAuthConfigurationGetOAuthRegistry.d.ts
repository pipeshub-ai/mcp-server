import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetOAuthRegistryRequest } from "../models/getoauthregistryop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List OAuth-capable connector types
 *
 * @remarks
 * Get all connector types that support OAuth authentication.<br><br>
 * <b>Admin Use:</b><br>
 * Admins use this to see which connector types need OAuth credentials
 * to be configured before users can authenticate.
 */
export declare function oAuthConfigurationGetOAuthRegistry(client$: PipeshubCore, request?: GetOAuthRegistryRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthConfigurationGetOAuthRegistry.d.ts.map