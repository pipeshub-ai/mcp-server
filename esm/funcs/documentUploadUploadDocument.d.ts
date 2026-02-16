import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadDocumentRequest } from "../models/uploaddocumentop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload a new document
 *
 * @remarks
 * Upload a new document to PipesHub storage. Supports multiple storage backends including S3, Azure Blob, and local storage.<br><br>
 * <b>Overview:</b><br>
 * This endpoint handles document uploads with automatic processing, metadata extraction, and optional versioning. It's the primary endpoint for adding new files to PipesHub.<br><br>
 * <b>Upload Flow:</b><br>
 * <ol>
 * <li>Client sends file with metadata via multipart/form-data</li>
 * <li>Document metadata saved to database</li>
 * <li>Returns document object with storage URLs</li>
 * </ol>
 * <b>File Size Limits:</b><br>
 * <ul>
 * <li><b>Maximum:</b> 1GB (1,073,741,824 bytes)</li>
 * <li><b>Large file threshold:</b> 10MB (triggers direct upload flow)</li>
 * </ul>
 * <b>Supported File Types:</b><br>
 * <ul>
 * <li><b>Documents:</b> PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, TXT, MD, CSV</li>
 * <li><b>Images:</b> PNG, JPG, JPEG, GIF, WebP, SVG, BMP, TIFF</li>
 * <li><b>Videos:</b> MP4, AVI, MOV, MKV, WebM</li>
 * <li><b>Audio:</b> MP3, WAV, FLAC, AAC</li>
 * <li><b>Archives:</b> ZIP, RAR, 7Z, TAR, GZ</li>
 * </ul>
 * <b>Version Control:</b><br>
 * Set <code>isVersionedFile: "true"</code> to enable version tracking. Versioned documents maintain full history of all changes.<br><br>
 * <b>Response Headers:</b><br>
 * <ul>
 * <li><code>x-document-id</code>: Unique document identifier</li>
 * <li><code>x-document-name</code>: Document name as stored</li>
 * </ul>
 * <b>Storage Backends:</b><br>
 * Automatically routes to configured storage: Amazon S3, Azure Blob Storage, or Local filesystem.
 */
export declare function documentUploadUploadDocument(client$: PipeshubCore, request: UploadDocumentRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentUploadUploadDocument.d.ts.map