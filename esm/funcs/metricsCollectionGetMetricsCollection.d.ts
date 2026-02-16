import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get metrics collection configuration
 *
 * @remarks
 * Retrieve the current metrics collection configuration including:
 * - Whether collection is enabled
 * - Push interval settings
 * - Server URL configuration
 * - Instance identification
 *
 * **Admin Access Required:** This endpoint requires administrator privileges.
 */
export declare function metricsCollectionGetMetricsCollection(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=metricsCollectionGetMetricsCollection.d.ts.map