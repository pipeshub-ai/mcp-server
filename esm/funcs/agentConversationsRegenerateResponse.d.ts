import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RegenerateAgentAnswerRequest } from "../models/regenerateagentanswerop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Regenerate agent response
 *
 * @remarks
 * Regenerate the agent's response for a specific message.<br><br>
 * <b>Overview:</b><br>
 * Similar to conversation regeneration but uses the agent's configuration.
 */
export declare function agentConversationsRegenerateResponse(client$: PipeshubCore, request: RegenerateAgentAnswerRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentConversationsRegenerateResponse.d.ts.map