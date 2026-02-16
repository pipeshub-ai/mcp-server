import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateDocumentPlaceholderRequest } from "../models/createdocumentplaceholderop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create document placeholder
 *
 * @remarks
 * Create a document metadata record without uploading file content. Used in conjunction with direct upload for large files.<br><br>
 * <b>Overview:</b><br>
 * This endpoint creates a document entry in the database without actual file content. The file is then uploaded directly to storage using the <code>/directUpload</code> endpoint.<br><br>
 * <b>Direct Upload Flow:</b><br>
 * <ol>
 * <li>Call this endpoint to create document placeholder</li>
 * <li>Receive document ID in response</li>
 * <li>Call <code>/document/{documentId}/directUpload</code> to get presigned URL</li>
 * <li>Upload file directly to presigned URL</li>
 * <li>Document becomes accessible once upload completes</li>
 * </ol>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Large file uploads (bypassing server)</li>
 * <li>Client-side upload progress tracking</li>
 * <li>Resumable uploads</li>
 * <li>Reduced server memory usage</li>
 * </ul>
 * <b>Note:</b> Extension must be provided without the dot (e.g., "pdf" not ".pdf").
 */
export declare function documentUploadCreatePlaceholder(client$: PipeshubCore, request: CreateDocumentPlaceholderRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentUploadCreatePlaceholder.d.ts.map