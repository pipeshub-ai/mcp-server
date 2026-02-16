import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListAgentConversationsRequest } from "../models/listagentconversationsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List agent conversations
 *
 * @remarks
 * Get all conversations with a specific agent.<br><br>
 * <b>Overview:</b><br>
 * Returns conversations the user has had with this particular agent.
 * Agent conversations maintain the agent's context and capabilities.
 */
export declare function agentConversationsListAgentConversations(client$: PipeshubCore, request: ListAgentConversationsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentConversationsListAgentConversations.d.ts.map