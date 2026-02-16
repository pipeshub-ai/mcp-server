import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SetMetricsServerUrlRequest } from "../models/setmetricsserverurlop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure metrics server URL
 *
 * @remarks
 * Set the remote server URL where metrics will be pushed.
 *
 * **Use Cases:**
 * - Self-hosted analytics: Point to your own Prometheus-compatible endpoint
 * - Custom monitoring: Integrate with your organization's monitoring stack
 * - Development: Use a local endpoint for testing
 *
 * **URL Requirements:**
 * - Must be a valid URL (http or https)
 * - Server must accept POST requests with JSON payload
 * - Server should return 2xx status for successful pushes
 *
 * **Admin Access Required:** This endpoint requires administrator privileges.
 */
export declare function metricsCollectionSetMetricsServerUrl(client$: PipeshubCore, request: SetMetricsServerUrlRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=metricsCollectionSetMetricsServerUrl.d.ts.map