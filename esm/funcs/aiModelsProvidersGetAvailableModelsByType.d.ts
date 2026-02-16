import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAvailableModelsByTypeRequest } from "../models/getavailablemodelsbytypeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get available models for selection
 *
 * @remarks
 * Get available models in a flattened format for UI selection dropdowns.
 */
export declare function aiModelsProvidersGetAvailableModelsByType(client$: PipeshubCore, request: GetAvailableModelsByTypeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsProvidersGetAvailableModelsByType.d.ts.map