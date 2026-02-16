import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DownloadDocumentRequest } from "../models/downloaddocumentop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
export declare enum DownloadAcceptEnum {
    applicationJsonAccept = "application/json",
    applicationOctetStreamAccept = "application/octet-stream"
}
/**
 * Download document
 *
 * @remarks
 * Get a time-limited signed URL to download the document, or receive the file directly for local storage.<br><br>
 * <b>Overview:</b><br>
 * This endpoint generates secure download access to documents. For cloud storage (S3/Azure), it returns a presigned URL. For local storage, it streams the file directly.<br><br>
 * <b>Download Behavior by Storage:</b><br>
 * <ul>
 * <li><b>S3/Azure:</b> Returns presigned URL valid for specified duration</li>
 * <li><b>Local:</b> Streams file directly with appropriate headers</li>
 * </ul>
 * <b>Version Download:</b><br>
 * Specify the <code>version</code> parameter to download a specific historical version. Only available for versioned documents.<br><br>
 * <b>URL Expiration:</b><br>
 * <ul>
 * <li>Default: 3600 seconds (1 hour)</li>
 * <li>Configurable via <code>expirationTimeInSeconds</code></li>
 * <li>Maximum depends on storage provider limits</li>
 * </ul>
 * <b>Security:</b><br>
 * Signed URLs are single-use and time-limited. They can be safely shared for temporary access.
 */
export declare function documentManagementDownload(client$: PipeshubCore, request: DownloadDocumentRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentManagementDownload.d.ts.map