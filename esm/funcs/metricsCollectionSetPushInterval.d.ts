import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SetMetricsPushIntervalRequest } from "../models/setmetricspushintervalop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure metrics push interval
 *
 * @remarks
 * Set how frequently collected metrics are pushed to the remote server.
 *
 * **Interval Guidelines:**
 * - Minimum: 1000ms (1 second) - for real-time monitoring
 * - Recommended: 60000ms (1 minute) - balanced performance
 * - Maximum: No hard limit, but longer intervals may delay insights
 *
 * **Performance Considerations:**
 * - Shorter intervals provide more real-time data but increase network traffic
 * - Longer intervals reduce overhead but delay metric visibility
 * - Changes take effect on the next push cycle
 *
 * **Admin Access Required:** This endpoint requires administrator privileges.
 */
export declare function metricsCollectionSetPushInterval(client$: PipeshubCore, request: SetMetricsPushIntervalRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=metricsCollectionSetPushInterval.d.ts.map