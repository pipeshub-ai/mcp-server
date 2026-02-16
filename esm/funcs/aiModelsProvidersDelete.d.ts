import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteAIModelProviderRequest } from "../models/deleteaimodelproviderop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete AI model provider
 *
 * @remarks
 * Remove an AI model provider configuration. Cannot delete the default model if it's the only one.
 */
export declare function aiModelsProvidersDelete(client$: PipeshubCore, request: DeleteAIModelProviderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsProvidersDelete.d.ts.map