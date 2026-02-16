import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DoclingParsePdfRequest } from "../models/doclingparsepdfop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Docling Service] Parse PDF (Phase 1)
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Phase 1 of two-phase PDF processing - parse PDF without block creation.<br><br>
 *
 * <b>Service:</b> Docling Service<br>
 * <b>Port:</b> 8081<br>
 * <b>Base URL:</b> <code>http://localhost:8081</code><br><br>
 *
 * <b>Authentication:</b> Internal only - called by Indexing Service<br><br>
 *
 * <b>Note:</b> This endpoint only parses the PDF structure without making
 * LLM calls for table processing. Use <code>/create-blocks</code> for Phase 2.
 */
export declare function doclingServiceDoclingParsePdf(client$: PipeshubCore, request: DoclingParsePdfRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=doclingServiceDoclingParsePdf.d.ts.map