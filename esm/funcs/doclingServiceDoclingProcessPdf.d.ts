import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DoclingProcessPdfRequest } from "../models/doclingprocesspdfop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Docling Service] Process PDF document
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Full PDF processing endpoint - parses PDF and creates content blocks.<br><br>
 *
 * <b>Service:</b> Docling Service<br>
 * <b>Port:</b> 8081<br>
 * <b>Base URL:</b> <code>http://localhost:8081</code><br><br>
 *
 * <b>Authentication:</b> Internal only - called by Indexing Service<br><br>
 *
 * <b>Processing Steps:</b>
 * <ol>
 * <li>Decode base64 PDF binary</li>
 * <li>Parse document structure using Docling library</li>
 * <li>Extract text, tables, and images</li>
 * <li>Create content blocks for indexing</li>
 * </ol>
 *
 * <b>Timeout:</b> 40 minutes (for large documents)
 */
export declare function doclingServiceDoclingProcessPdf(client$: PipeshubCore, request: DoclingProcessPdfRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=doclingServiceDoclingProcessPdf.d.ts.map