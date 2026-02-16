import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] List available agent tools
 *
 * @remarks
 * Retrieve all available tools that can be used by AI agents.<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Overview:</b><br>
 * Returns a list of tools registered in the system, including their parameters,
 * descriptions, and tags. Tools are loaded from ArangoDB.<br><br>
 *
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Agent configuration UI - show available tools to assign to agents</li>
 * <li>Tool discovery for building custom agent workflows</li>
 * </ul>
 */
export declare function queryServiceListTools(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceListTools.d.ts.map