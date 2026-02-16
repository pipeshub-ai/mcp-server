import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteRecordRequest } from "../models/deleterecordop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete record
 *
 * @remarks
 * Permanently delete a record from the knowledge base.<br><br>
 * <b>Required Permission:</b> WRITER or higher<br><br>
 * <b>What Gets Deleted:</b><br>
 * <ul>
 * <li>Record metadata</li>
 * <li>Associated storage file</li>
 * <li>Indexed content and embeddings</li>
 * </ul>
 * <b>Warning:</b> This action is irreversible.
 */
export declare function recordsDelete(client$: PipeshubCore, request: DeleteRecordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsDelete.d.ts.map