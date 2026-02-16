import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RegenerateAnswerRequest } from "../models/regenerateanswerop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Regenerate AI response
 *
 * @remarks
 * Regenerate the AI response for a specific message.<br><br>
 * <b>Overview:</b><br>
 * If you're not satisfied with an AI response, use this endpoint to generate
 * a new answer. The AI will re-process the original query and may produce
 * a different response.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Response was incomplete or unclear</li>
 * <li>Want to try a different AI model</li>
 * <li>New documents have been indexed since original response</li>
 * </ul>
 * <b>Model Override:</b><br>
 * Specify <code>modelKey</code> to use a different model for regeneration.
 */
export declare function conversationsRegenerateAnswer(client$: PipeshubCore, request: RegenerateAnswerRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsRegenerateAnswer.d.ts.map