import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ReindexRecordRequest } from "../models/reindexrecordop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reindex single record
 *
 * @remarks
 * Trigger reindexing for a specific record.<br><br>
 * <b>Overview:</b><br>
 * Reprocesses the record's content to update search indexes and AI embeddings. Useful after content changes or to fix indexing failures.<br><br>
 * <b>Depth Parameter:</b><br>
 * Controls processing depth for complex documents (-1 for full depth, 0-100 for limited).
 */
export declare function connectorsReindexRecord(client$: PipeshubCore, request: ReindexRecordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorsReindexRecord.d.ts.map