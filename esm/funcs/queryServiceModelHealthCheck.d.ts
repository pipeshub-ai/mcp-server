import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { QueryServiceHealthCheckRequest, QueryServiceHealthCheckSecurity } from "../models/queryservicehealthcheckop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] AI model health check
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Validate LLM or embedding model configuration.<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Authentication:</b> Requires scoped service token<br><br>
 *
 * <b>Model Types:</b>
 * <ul>
 * <li><code>llm</code> - Test LLM configuration (text generation)</li>
 * <li><code>embedding</code> - Test embedding model configuration</li>
 * </ul>
 */
export declare function queryServiceModelHealthCheck(client$: PipeshubCore, security: QueryServiceHealthCheckSecurity, request: QueryServiceHealthCheckRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceModelHealthCheck.d.ts.map