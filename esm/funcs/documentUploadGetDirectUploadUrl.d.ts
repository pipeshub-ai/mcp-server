import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetDirectUploadUrlRequest } from "../models/getdirectuploadurlop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get direct upload URL
 *
 * @remarks
 * Generate a presigned URL for direct client-to-storage upload, bypassing the server for large files.<br><br>
 * <b>Overview:</b><br>
 * This endpoint provides a presigned URL that allows clients to upload directly to storage (S3/Azure) without routing through the server. Essential for large file uploads.<br><br>
 * <b>Direct Upload Flow:</b><br>
 * <ol>
 * <li>Create document placeholder with <code>/placeholder</code></li>
 * <li>Call this endpoint with document ID</li>
 * <li>Receive presigned URL and document ID</li>
 * <li>Client uploads file directly to presigned URL (PUT request)</li>
 * <li>Document becomes available once upload completes</li>
 * </ol>
 * <b>Benefits:</b><br>
 * <ul>
 * <li>No server memory consumption for large files</li>
 * <li>Direct transfer to storage (faster)</li>
 * <li>Client-side progress tracking</li>
 * <li>Reduced server bandwidth</li>
 * </ul>
 * <b>URL Validity:</b><br>
 * Presigned URLs typically expire after 1 hour. Upload must complete before expiration.<br><br>
 * <b>Note:</b> Only available for S3 and Azure Blob storage. Local storage does not support direct upload.
 */
export declare function documentUploadGetDirectUploadUrl(client$: PipeshubCore, request: GetDirectUploadUrlRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentUploadGetDirectUploadUrl.d.ts.map