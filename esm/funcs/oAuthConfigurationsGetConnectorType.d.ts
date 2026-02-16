import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetOAuthConnectorTypeRequest } from "../models/getoauthconnectortypeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get OAuth connector type details
 *
 * @remarks
 * Get details for a specific OAuth-capable connector type.
 */
export declare function oAuthConfigurationsGetConnectorType(client$: PipeshubCore, request: GetOAuthConnectorTypeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthConfigurationsGetConnectorType.d.ts.map