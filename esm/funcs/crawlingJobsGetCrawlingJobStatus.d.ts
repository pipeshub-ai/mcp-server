import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetCrawlingJobStatusRequest } from "../models/getcrawlingjobstatusop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get crawling job status
 *
 * @remarks
 * Retrieve the current status of a scheduled crawling job for a specific connector.<br><br>
 *
 * <b>Overview:</b><br>
 * Returns detailed information about the most recent crawling job for the specified connector,
 * including its current state, progress, timing information, and any error details.<br><br>
 *
 * <b>Job States:</b><br>
 * <ul>
 * <li><b>waiting:</b> Job is queued and waiting to be processed</li>
 * <li><b>active:</b> Job is currently being processed by a worker</li>
 * <li><b>completed:</b> Job finished successfully</li>
 * <li><b>failed:</b> Job failed after exhausting retry attempts</li>
 * <li><b>delayed:</b> Job is scheduled for future execution</li>
 * <li><b>paused:</b> Job has been manually paused</li>
 * </ul>
 *
 * <b>Access Control:</b><br>
 * Same as scheduling - team connectors require admin, personal connectors require creator.
 */
export declare function crawlingJobsGetCrawlingJobStatus(client$: PipeshubCore, request: GetCrawlingJobStatusRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsGetCrawlingJobStatus.d.ts.map