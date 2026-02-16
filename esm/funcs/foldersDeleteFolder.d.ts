import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteFolderRequest } from "../models/deletefolderop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete folder
 *
 * @remarks
 * Delete a folder and all its contents.<br><br>
 * <b>Required Permission:</b> FILEORGANIZER or higher<br><br>
 * <b>Cascade Delete:</b><br>
 * All subfolders and records within will be permanently deleted.<br><br>
 * <b>Warning:</b> This action is irreversible.
 */
export declare function foldersDeleteFolder(client$: PipeshubCore, request: DeleteFolderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=foldersDeleteFolder.d.ts.map