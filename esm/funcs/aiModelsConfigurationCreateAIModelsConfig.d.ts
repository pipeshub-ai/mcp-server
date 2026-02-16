import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AIModelsConfigInput } from "../models/aimodelsconfiginput.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Bulk create AI models configuration
 *
 * @remarks
 * Configure multiple AI model providers at once. Performs health checks on each model before saving. Use this for initial setup - for individual model management, use /ai-models/providers endpoints.
 */
export declare function aiModelsConfigurationCreateAIModelsConfig(client$: PipeshubCore, request: AIModelsConfigInput, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsConfigurationCreateAIModelsConfig.d.ts.map