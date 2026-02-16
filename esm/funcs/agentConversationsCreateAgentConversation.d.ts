import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAgentConversationRequest } from "../models/createagentconversationop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create agent conversation
 *
 * @remarks
 * Start a new conversation with an agent.<br><br>
 * <b>Overview:</b><br>
 * Creates a conversation using the agent's configuration including
 * its system prompt, tools, and knowledge base access.
 */
export declare function agentConversationsCreateAgentConversation(client$: PipeshubCore, request: CreateAgentConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentConversationsCreateAgentConversation.d.ts.map