import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Indexing Service] Health check
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Health check endpoint for the Indexing Service (Python FastAPI).<br><br>
 *
 * <b>Service:</b> Indexing Service<br>
 * <b>Port:</b> 8091<br>
 * <b>Base URL:</b> <code>http://localhost:8091</code><br><br>
 *
 * <b>Authentication:</b> None required for health check<br><br>
 *
 * <b>Note:</b> This is an internal service. It processes Kafka messages
 * for document indexing and does not expose user-facing endpoints.
 * Health check also verifies Connector Service connectivity.
 */
export declare function indexingServiceHealth(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=indexingServiceHealth.d.ts.map