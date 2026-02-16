import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { StreamRecordBufferRequest } from "../models/streamrecordbufferop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Stream record content
 *
 * @remarks
 * Stream the binary content of a record's file.<br><br>
 * <b>Overview:</b><br>
 * Returns the raw file content with appropriate Content-Type and Content-Disposition headers for download or inline viewing.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>File downloads</li>
 * <li>Inline document preview</li>
 * <li>Content extraction pipelines</li>
 * </ul>
 * <b>Format Conversion:</b><br>
 * Use <code>convertTo</code> parameter to convert between formats (e.g., DOCX to PDF).
 */
export declare function recordsStream(client$: PipeshubCore, request: StreamRecordBufferRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsStream.d.ts.map