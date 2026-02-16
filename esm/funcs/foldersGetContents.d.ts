import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetFolderContentsRequest } from "../models/getfoldercontentsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get folder contents
 *
 * @remarks
 * Retrieve the contents of a folder including subfolders and records.<br><br>
 * <b>Overview:</b><br>
 * Returns paginated list of records within the folder, with same filtering options as KB-level record listing.<br><br>
 * <b>Navigation:</b><br>
 * Use this endpoint to browse folder hierarchies. Response includes folder metadata and child items.
 */
export declare function foldersGetContents(client$: PipeshubCore, request: GetFolderContentsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=foldersGetContents.d.ts.map