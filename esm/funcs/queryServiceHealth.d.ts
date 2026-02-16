import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] Health check
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Health check endpoint for the Query Service (Python FastAPI).<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Authentication:</b> None required for health check<br><br>
 *
 * <b>Note:</b> This is an internal service health endpoint. It also verifies
 * connectivity to the Connector Service as a dependency check.
 */
export declare function queryServiceHealth(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceHealth.d.ts.map