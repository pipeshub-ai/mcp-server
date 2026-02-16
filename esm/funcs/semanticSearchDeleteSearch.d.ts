import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteSearchRequest } from "../models/deletesearchop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete search
 *
 * @remarks
 * Delete a specific search from history.<br><br>
 * <b>Overview:</b><br>
 * Permanently removes the search record from your history.
 */
export declare function semanticSearchDeleteSearch(client$: PipeshubCore, request: DeleteSearchRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchDeleteSearch.d.ts.map