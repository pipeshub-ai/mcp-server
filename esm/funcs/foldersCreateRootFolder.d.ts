import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateRootFolderRequest } from "../models/createrootfolderop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create root folder
 *
 * @remarks
 * Create a new folder at the root level of a knowledge base.<br><br>
 * <b>Required Permission:</b> FILEORGANIZER or higher<br><br>
 * <b>Folder Features:</b><br>
 * <ul>
 * <li>Organize records hierarchically</li>
 * <li>Support nested subfolders</li>
 * <li>Inherit parent KB permissions</li>
 * </ul>
 * <b>Naming Rules:</b><br>
 * <ul>
 * <li>1-255 characters</li>
 * <li>XSS protection applied</li>
 * <li>Can contain spaces and special characters</li>
 * </ul>
 */
export declare function foldersCreateRootFolder(client$: PipeshubCore, request: CreateRootFolderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=foldersCreateRootFolder.d.ts.map