import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetDocumentBufferRequest } from "../models/getdocumentbufferop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get document buffer
 *
 * @remarks
 * Retrieve the raw binary content of a document as a buffer. Used for in-memory document processing.<br><br>
 * <b>Overview:</b><br>
 * Returns the complete file content as a binary buffer. This is useful for server-side document processing, content analysis, or format conversion.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Document parsing and text extraction</li>
 * <li>Format conversion pipelines</li>
 * <li>Content analysis and indexing</li>
 * <li>Thumbnail generation</li>
 * </ul>
 * <b>Version Support:</b><br>
 * Specify <code>version</code> to get a specific historical version's content.<br><br>
 * <b>Memory Considerations:</b><br>
 * Large files will consume significant memory. For files &gt;100MB, consider using streaming download instead.<br><br>
 * <b>Response Format:</b><br>
 * Returns Node.js Buffer object serialized as JSON with type and data array.
 */
export declare function documentBufferGet(client$: PipeshubCore, request: GetDocumentBufferRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentBufferGet.d.ts.map