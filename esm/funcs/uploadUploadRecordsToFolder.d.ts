import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadRecordsToFolderRequest } from "../models/uploadrecordstofolderop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload files to folder
 *
 * @remarks
 * Upload files directly to a specific folder within a knowledge base.<br><br>
 * <b>Same as KB upload</b> but files are placed in the specified folder instead of KB root.
 */
export declare function uploadUploadRecordsToFolder(client$: PipeshubCore, request: UploadRecordsToFolderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=uploadUploadRecordsToFolder.d.ts.map