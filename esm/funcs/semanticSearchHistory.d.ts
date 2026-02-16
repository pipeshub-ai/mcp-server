import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SearchHistoryRequest } from "../models/searchhistoryop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get search history
 *
 * @remarks
 * Retrieve your search history with pagination.<br><br>
 * <b>Overview:</b><br>
 * Returns a list of all searches performed by the authenticated user.
 * Each entry includes the original query, results, and metadata.<br><br>
 * <b>Pagination:</b><br>
 * Use <code>page</code> and <code>limit</code> to navigate through results.
 */
export declare function semanticSearchHistory(client$: PipeshubCore, request?: SearchHistoryRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchHistory.d.ts.map