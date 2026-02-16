import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAllRecordsRequest } from "../models/getallrecordsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all records across knowledge bases
 *
 * @remarks
 * Retrieve records from all knowledge bases accessible to the user.<br><br>
 * <b>Overview:</b><br>
 * Search and filter records across your entire organization. Useful for global search, reporting, and cross-KB content discovery.<br><br>
 * <b>Filtering Options:</b><br>
 * <ul>
 * <li><b>search:</b> Full-text search in record names</li>
 * <li><b>recordTypes:</b> FILE, WEBPAGE, EMAIL, MESSAGE, TICKET, etc.</li>
 * <li><b>origins:</b> UPLOAD or CONNECTOR</li>
 * <li><b>connectors:</b> Filter by connector source</li>
 * <li><b>indexingStatus:</b> COMPLETED, FAILED, IN_PROGRESS, etc.</li>
 * <li><b>dateFrom/dateTo:</b> Filter by creation date range</li>
 * </ul>
 * <b>Response Includes:</b><br>
 * <ul>
 * <li>Paginated record list</li>
 * <li>Applied and available filter counts</li>
 * <li>Pagination metadata</li>
 * </ul>
 */
export declare function recordsGetAll(client$: PipeshubCore, request?: GetAllRecordsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsGetAll.d.ts.map