import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { PauseCrawlingJobRequest } from "../models/pausecrawlingjobop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Pause a crawling job
 *
 * @remarks
 * Pause a running or scheduled crawling job without losing its configuration.<br><br>
 *
 * <b>Overview:</b><br>
 * Pausing a job stores its complete configuration and removes it from the active queue.
 * The job can be resumed later with <code>POST /crawlingManager/{connector}/{connectorId}/resume</code>,
 * which will restore the exact same schedule configuration.<br><br>
 *
 * <b>How Pausing Works:</b><br>
 * <ol>
 * <li>Current job configuration is stored in memory</li>
 * <li>Active/repeatable job is removed from BullMQ queue</li>
 * <li>Job state changes to "paused"</li>
 * <li>No new job executions will occur until resumed</li>
 * </ol>
 *
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Temporarily stop crawling during maintenance</li>
 * <li>Pause data sync while investigating issues</li>
 * <li>Stop crawling for a connector being reconfigured</li>
 * </ul>
 *
 * <b>Note:</b> If a job is currently active (processing), it will complete before pausing.
 */
export declare function crawlingJobsPause(client$: PipeshubCore, request: PauseCrawlingJobRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsPause.d.ts.map