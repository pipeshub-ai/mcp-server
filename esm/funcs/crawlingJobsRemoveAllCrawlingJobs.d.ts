import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove all crawling jobs
 *
 * @remarks
 * Remove all scheduled crawling jobs for the current organization.<br><br>
 *
 * <b>Overview:</b><br>
 * Bulk operation to remove all crawling jobs across all connectors for the organization.
 * This is useful when decommissioning an organization or doing a complete reset.<br><br>
 *
 * <b>What Gets Removed:</b><br>
 * <ul>
 * <li>All active and waiting jobs</li>
 * <li>All repeatable job configurations</li>
 * <li>All paused jobs</li>
 * <li>All job mappings for the organization</li>
 * </ul>
 *
 * <b>Warning:</b> This operation cannot be undone. All job configurations will need
 * to be recreated manually.
 */
export declare function crawlingJobsRemoveAllCrawlingJobs(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=crawlingJobsRemoveAllCrawlingJobs.d.ts.map