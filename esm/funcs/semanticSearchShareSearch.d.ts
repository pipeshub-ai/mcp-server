import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ShareSearchRequest } from "../models/sharesearchop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Share search results
 *
 * @remarks
 * Share search results with other users.<br><br>
 * <b>Overview:</b><br>
 * Allows sharing a search and its results with colleagues.
 * Useful for collaborative research or knowledge sharing.
 */
export declare function semanticSearchShareSearch(client$: PipeshubCore, request: ShareSearchRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchShareSearch.d.ts.map