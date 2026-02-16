import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DoclingCreateBlocksRequest } from "../models/doclingcreateblocksop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Docling Service] Create blocks from parse result (Phase 2)
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Phase 2 of two-phase PDF processing - create blocks from parse result.<br><br>
 *
 * <b>Service:</b> Docling Service<br>
 * <b>Port:</b> 8081<br>
 * <b>Base URL:</b> <code>http://localhost:8081</code><br><br>
 *
 * <b>Authentication:</b> Internal only - called by Indexing Service<br><br>
 *
 * <b>Note:</b> This endpoint creates content blocks from a previously parsed
 * PDF document. It may involve LLM calls for table processing.
 */
export declare function doclingServiceDoclingCreateBlocks(client$: PipeshubCore, request: DoclingCreateBlocksRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=doclingServiceDoclingCreateBlocks.d.ts.map