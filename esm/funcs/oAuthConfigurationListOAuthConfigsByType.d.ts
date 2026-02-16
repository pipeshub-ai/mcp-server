import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListOAuthConfigsByTypeRequest } from "../models/listoauthconfigsbytypeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List OAuth configs for connector type
 *
 * @remarks
 * Get all OAuth configurations for a specific connector type.
 */
export declare function oAuthConfigurationListOAuthConfigsByType(client$: PipeshubCore, request: ListOAuthConfigsByTypeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthConfigurationListOAuthConfigsByType.d.ts.map