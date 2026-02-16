import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadRecordsToKBRequest } from "../models/uploadrecordstokbop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload files to knowledge base
 *
 * @remarks
 * Upload one or more files directly to a knowledge base.<br><br>
 * <b>Overview:</b><br>
 * Batch upload multiple files in a single request. Each file becomes a new record in the KB with automatic content indexing.<br><br>
 * <b>Upload Limits:</b><br>
 * <ul>
 * <li><b>Max files per request:</b> 1000</li>
 * <li><b>Default max file size:</b> 30MB (configurable via platform settings)</li>
 * <li>Use <code>GET /knowledgeBase/limits</code> to check current limits</li>
 * </ul>
 * <b>Supported File Types:</b><br>
 * Documents (PDF, DOCX, TXT), Images (PNG, JPG), Videos (MP4), and more.<br><br>
 * <b>File Metadata:</b><br>
 * Use <code>files_metadata</code> to provide additional info like file paths and last modified timestamps.<br><br>
 * <b>Versioning:</b><br>
 * Set <code>isVersioned: true</code> to enable version tracking for uploaded files.
 */
export declare function uploadUploadRecordsToKB(client$: PipeshubCore, request: UploadRecordsToKBRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=uploadUploadRecordsToKB.d.ts.map