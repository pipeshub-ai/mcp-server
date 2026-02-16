import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CustomSystemPrompt } from "../models/customsystemprompt.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update custom system prompt
 *
 * @remarks
 * Set a custom system prompt that will be used by AI models.
 */
export declare function platformSettingsSetCustomSystemPrompt(client$: PipeshubCore, request: CustomSystemPrompt, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=platformSettingsSetCustomSystemPrompt.d.ts.map