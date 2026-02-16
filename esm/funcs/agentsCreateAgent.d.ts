import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAgentRequest } from "../models/createagentop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create agent
 *
 * @remarks
 * Create a new custom AI agent.<br><br>
 * <b>Overview:</b><br>
 * Agents are specialized AI assistants configured for specific tasks.
 * They can have custom system prompts, access to specific tools, and
 * be limited to certain knowledge bases.<br><br>
 * <b>Agent Configuration:</b><br>
 * <ul>
 * <li><b>System prompt:</b> Instructions that define agent behavior</li>
 * <li><b>Tools:</b> Capabilities like web search, code execution, etc.</li>
 * <li><b>Knowledge bases:</b> Data sources the agent can access</li>
 * <li><b>Model config:</b> AI model settings (temperature, max tokens)</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Customer support bot with product knowledge</li>
 * <li>Code review assistant with repository access</li>
 * <li>HR assistant with policy documents</li>
 * </ul>
 */
export declare function agentsCreateAgent(client$: PipeshubCore, request: CreateAgentRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentsCreateAgent.d.ts.map