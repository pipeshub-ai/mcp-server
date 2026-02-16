import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ToggleMetricsCollectionRequest } from "../models/togglemetricscollectionop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Enable or disable metrics collection
 *
 * @remarks
 * Toggle the master switch for metrics collection.
 *
 * **When Enabled:**
 * - Application metrics are collected in the background
 * - Metrics are pushed to the configured server at regular intervals
 * - Activity counters track API usage patterns
 *
 * **When Disabled:**
 * - No metrics are collected or stored
 * - No data is sent to the metrics server
 * - Existing scheduled push jobs are stopped
 *
 * **Admin Access Required:** This endpoint requires administrator privileges.
 */
export declare function metricsCollectionToggleMetricsCollection(client$: PipeshubCore, request: ToggleMetricsCollectionRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=metricsCollectionToggleMetricsCollection.d.ts.map