import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetSearchByIdRequest } from "../models/getsearchbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get search by ID
 *
 * @remarks
 * Retrieve a specific search result by its ID.<br><br>
 * <b>Overview:</b><br>
 * Returns the full search record including query, all results,
 * and any sharing/archive status.
 */
export declare function semanticSearchGetById(client$: PipeshubCore, request: GetSearchByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchGetById.d.ts.map