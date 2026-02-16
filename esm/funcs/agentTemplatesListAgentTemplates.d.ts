import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List agent templates
 *
 * @remarks
 * Retrieve all available agent templates.<br><br>
 * <b>Overview:</b><br>
 * Agent templates provide pre-configured starting points for creating
 * custom AI agents. Templates include system prompts, recommended tools,
 * and configuration schemas.<br><br>
 * <b>Template Types:</b><br>
 * <ul>
 * <li>Public templates available to all organization users</li>
 * <li>Private templates created by individual users</li>
 * </ul>
 */
export declare function agentTemplatesListAgentTemplates(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentTemplatesListAgentTemplates.d.ts.map