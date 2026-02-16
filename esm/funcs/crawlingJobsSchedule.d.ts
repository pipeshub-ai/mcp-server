import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ScheduleCrawlingJobRequest } from "../models/schedulecrawlingjobop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Schedule a crawling job
 *
 * @remarks
 * Schedule a new crawling job for a specific connector instance.<br><br>
 *
 * <b>Overview:</b><br>
 * Creates a scheduled crawling job that will sync data from the specified connector into
 * PipesHub's search index. The job is added to a BullMQ queue and will execute according
 * to the specified schedule configuration.<br><br>
 *
 * <b>Schedule Types:</b><br>
 * <ul>
 * <li><b>hourly:</b> Run every X hours at specified minute (e.g., every 2 hours at :30)</li>
 * <li><b>daily:</b> Run once per day at specified time (e.g., 2:00 AM daily)</li>
 * <li><b>weekly:</b> Run on specific days of the week (e.g., Mon/Wed/Fri at 3:00 AM)</li>
 * <li><b>monthly:</b> Run on specific day of month (e.g., 1st of each month at 4:00 AM)</li>
 * <li><b>custom:</b> Use cron expression for complex schedules</li>
 * <li><b>once:</b> Run once at a specific future datetime</li>
 * </ul>
 *
 * <b>Access Control:</b><br>
 * <ul>
 * <li>Team-scoped connectors: Requires admin privileges</li>
 * <li>Personal-scoped connectors: Only the creator can schedule jobs</li>
 * </ul>
 *
 * <b>Job Behavior:</b><br>
 * <ul>
 * <li>If a job already exists for this connector, it will be replaced</li>
 * <li>Disabled schedules (<code>isEnabled: false</code>) will throw an error</li>
 * <li>Jobs use exponential backoff for retries (5s, 10s, 20s, etc.)</li>
 * <li>Only last 10 completed/failed jobs are retained per connector</li>
 * </ul>
 *
 * <b>Related Endpoints:</b><br>
 * <ul>
 * <li><code>GET /crawlingManager/{connector}/{connectorId}/schedule</code> - Get job status</li>
 * <li><code>POST /crawlingManager/{connector}/{connectorId}/pause</code> - Pause job</li>
 * <li><code>DELETE /crawlingManager/{connector}/{connectorId}/remove</code> - Remove job</li>
 * </ul>
 */
export declare function crawlingJobsSchedule(client$: PipeshubCore, request: ScheduleCrawlingJobRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsSchedule.d.ts.map