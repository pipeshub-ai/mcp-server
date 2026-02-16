import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all crawling job statuses
 *
 * @remarks
 * Retrieve the status of all scheduled crawling jobs for the current organization.<br><br>
 *
 * <b>Overview:</b><br>
 * Returns a list of all crawling jobs across all connectors for the authenticated user's
 * organization. This includes active, waiting, paused, completed, and failed jobs.<br><br>
 *
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Jobs are grouped by connector type</li>
 * <li>Last 10 jobs per connector type are returned</li>
 * <li>Includes both active queue jobs and paused jobs</li>
 * </ul>
 *
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Dashboard overview of all crawling activities</li>
 * <li>Monitoring job health across connectors</li>
 * <li>Identifying failed or stuck jobs</li>
 * </ul>
 */
export declare function crawlingJobsGetAllStatus(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsGetAllStatus.d.ts.map