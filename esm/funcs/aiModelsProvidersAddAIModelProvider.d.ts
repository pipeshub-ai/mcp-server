import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddAIModelProviderRequest } from "../models/addaimodelproviderrequest.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add new AI model provider
 *
 * @remarks
 * Add a new AI model provider configuration. Performs a health check before saving to verify connectivity. Supported providers: openai, anthropic, azure-openai, aws-bedrock, google-vertex, ollama, huggingface.
 */
export declare function aiModelsProvidersAddAIModelProvider(client$: PipeshubCore, request: AddAIModelProviderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsProvidersAddAIModelProvider.d.ts.map