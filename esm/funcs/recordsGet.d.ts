import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetKBRecordsRequest } from "../models/getkbrecordsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get records for a knowledge base
 *
 * @remarks
 * Retrieve a paginated list of records within a specific knowledge base.<br><br>
 * <b>Overview:</b><br>
 * Returns all records (documents, files, content) stored in the specified KB, with powerful filtering and sorting capabilities.<br><br>
 * <b>Filtering:</b><br>
 * <ul>
 * <li><b>search:</b> Search by record name (partial match, max 1000 chars)</li>
 * <li><b>recordTypes:</b> FILE, WEBPAGE, COMMENT, MESSAGE, EMAIL, TICKET</li>
 * <li><b>origins:</b> UPLOAD (manual uploads) or CONNECTOR (synced)</li>
 * <li><b>indexingStatus:</b> Filter by processing state</li>
 * <li><b>dateFrom/dateTo:</b> Creation date range (Unix timestamps)</li>
 * </ul>
 * <b>Sorting:</b><br>
 * Default sorts by <code>createdAtTimestamp</code> descending (newest first).
 */
export declare function recordsGet(client$: PipeshubCore, request: GetKBRecordsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsGet.d.ts.map