import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SetDefaultAIModelRequest } from "../models/setdefaultaimodelop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Set default AI model
 *
 * @remarks
 * Set a model as the default for its type.
 */
export declare function aiModelsProvidersSetDefaultAIModel(client$: PipeshubCore, request: SetDefaultAIModelRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsProvidersSetDefaultAIModel.d.ts.map