import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateSubfolderRequest } from "../models/createsubfolderop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create subfolder
 *
 * @remarks
 * Create a nested folder within an existing folder.<br><br>
 * <b>Required Permission:</b> FILEORGANIZER or higher<br><br>
 * <b>Nesting:</b><br>
 * Supports unlimited folder nesting depth for complex organizational structures.
 */
export declare function foldersCreateSub(client$: PipeshubCore, request: CreateSubfolderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=foldersCreateSub.d.ts.map