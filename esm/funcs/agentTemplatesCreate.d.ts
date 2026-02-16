import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAgentTemplateRequest } from "../models/createagenttemplateop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create agent template
 *
 * @remarks
 * Create a new reusable agent template.<br><br>
 * <b>Overview:</b><br>
 * Templates define the base configuration for agents including
 * system prompts, tool recommendations, and customization options.<br><br>
 * <b>Template Components:</b><br>
 * <ul>
 * <li><b>System prompt:</b> Default instructions for agents</li>
 * <li><b>Recommended tools:</b> Suggested tool integrations</li>
 * <li><b>Config schema:</b> JSON Schema for customization options</li>
 * </ul>
 */
export declare function agentTemplatesCreate(client$: PipeshubCore, request: CreateAgentTemplateRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentTemplatesCreate.d.ts.map