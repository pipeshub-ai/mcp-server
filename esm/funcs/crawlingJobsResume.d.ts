import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ResumeCrawlingJobRequest } from "../models/resumecrawlingjobop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Resume a paused crawling job
 *
 * @remarks
 * Resume a previously paused crawling job using its stored configuration.<br><br>
 *
 * <b>Overview:</b><br>
 * Restores a paused job to active state using the exact configuration it had when paused.
 * A new job is created in BullMQ with the same schedule settings.<br><br>
 *
 * <b>How Resuming Works:</b><br>
 * <ol>
 * <li>Retrieve stored job configuration from pause state</li>
 * <li>Create new scheduled job with same configuration</li>
 * <li>Remove from paused jobs tracking</li>
 * <li>Job will execute according to its original schedule</li>
 * </ol>
 *
 * <b>Note:</b> The job will resume according to its schedule, not immediately execute
 * (unless it's a one-time job that hasn't run yet).
 */
export declare function crawlingJobsResume(client$: PipeshubCore, request: ResumeCrawlingJobRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsResume.d.ts.map