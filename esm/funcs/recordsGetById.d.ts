import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetRecordByIdRequest } from "../models/getrecordbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get record by ID
 *
 * @remarks
 * Retrieve detailed information about a specific record.<br><br>
 * <b>Overview:</b><br>
 * Returns complete record metadata including name, type, indexing status, storage information, and version history.<br><br>
 * <b>File Conversion:</b><br>
 * Use the optional <code>convertTo</code> parameter to request file format conversion (e.g., PDF to text).
 */
export declare function recordsGetById(client$: PipeshubCore, request: GetRecordByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsGetById.d.ts.map