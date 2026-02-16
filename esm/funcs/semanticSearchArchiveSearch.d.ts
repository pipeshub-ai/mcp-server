import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ArchiveSearchRequest } from "../models/archivesearchop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Archive search
 *
 * @remarks
 * Archive a search to hide it from the main history list.
 */
export declare function semanticSearchArchiveSearch(client$: PipeshubCore, request: ArchiveSearchRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchArchiveSearch.d.ts.map