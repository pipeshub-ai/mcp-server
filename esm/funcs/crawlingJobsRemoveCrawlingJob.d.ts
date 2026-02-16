import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RemoveCrawlingJobRequest } from "../models/removecrawlingjobop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove a crawling job
 *
 * @remarks
 * Permanently remove a scheduled crawling job for a specific connector.<br><br>
 *
 * <b>Overview:</b><br>
 * Removes the crawling job and all associated data from the queue. This includes
 * removing repeatable job configurations and cleaning up job history.<br><br>
 *
 * <b>What Gets Removed:</b><br>
 * <ul>
 * <li>Active or waiting job instances</li>
 * <li>Repeatable job configuration (for recurring schedules)</li>
 * <li>Paused job information</li>
 * <li>Job mappings and metadata</li>
 * </ul>
 *
 * <b>Note:</b> Completed and failed job records may be retained for audit purposes.
 *
 * <b>Related Endpoints:</b><br>
 * <ul>
 * <li><code>DELETE /crawlingManager/schedule/all</code> - Remove all jobs for organization</li>
 * </ul>
 */
export declare function crawlingJobsRemoveCrawlingJob(client$: PipeshubCore, request: RemoveCrawlingJobRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsRemoveCrawlingJob.d.ts.map