import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Docling Service] Health check
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Health check endpoint for the Docling Service (Python FastAPI).<br><br>
 *
 * <b>Service:</b> Docling Service<br>
 * <b>Port:</b> 8081<br>
 * <b>Base URL:</b> <code>http://localhost:8081</code><br><br>
 *
 * <b>Authentication:</b> None required for health check<br><br>
 *
 * <b>Note:</b> This is an internal service used by the Indexing Service
 * for advanced document parsing. No user-facing endpoints.
 */
export declare function doclingServiceHealth(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=doclingServiceHealth.d.ts.map