import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get queue statistics
 *
 * @remarks
 * Retrieve aggregate statistics about the crawling job queue.<br><br>
 *
 * <b>Overview:</b><br>
 * Returns real-time statistics about the BullMQ queue including job counts by state,
 * paused jobs, and repeatable job configurations. Useful for monitoring system health
 * and capacity planning.<br><br>
 *
 * <b>Statistics Included:</b><br>
 * <ul>
 * <li><b>waiting:</b> Jobs queued and waiting to be processed</li>
 * <li><b>active:</b> Jobs currently being processed by workers</li>
 * <li><b>completed:</b> Successfully completed jobs (limited retention)</li>
 * <li><b>failed:</b> Failed jobs (limited retention)</li>
 * <li><b>delayed:</b> Jobs scheduled for future execution</li>
 * <li><b>paused:</b> Manually paused jobs</li>
 * <li><b>repeatable:</b> Number of repeatable job configurations</li>
 * <li><b>total:</b> Sum of all job counts</li>
 * </ul>
 *
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Monitor queue health and throughput</li>
 * <li>Identify processing bottlenecks</li>
 * <li>Track failed job counts for alerting</li>
 * <li>Capacity planning based on queue depth</li>
 * </ul>
 */
export declare function queueManagementGetStats(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queueManagementGetStats.d.ts.map