import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List available tools
 *
 * @remarks
 * Get all tools that can be assigned to agents.<br><br>
 * <b>Overview:</b><br>
 * Tools extend agent capabilities beyond basic Q&A. Each tool
 * has specific inputs and outputs defined by its schema.<br><br>
 * <b>Common Tools:</b><br>
 * <ul>
 * <li><b>web-search:</b> Search the internet</li>
 * <li><b>code-interpreter:</b> Execute code snippets</li>
 * <li><b>file-reader:</b> Read uploaded files</li>
 * <li><b>api-caller:</b> Make external API requests</li>
 * </ul>
 */
export declare function agentsListTools(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentsListTools.d.ts.map