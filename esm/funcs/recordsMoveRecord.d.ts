import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { MoveRecordRequest } from "../models/moverecordop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Move a record to another folder
 *
 * @remarks
 * Move a record (file or folder) to a different parent folder within the same knowledge base.<br><br>
 * <b>Required Permission:</b> WRITER or higher<br><br>
 * <b>Moving to Root:</b><br>
 * Set <code>newParentId</code> to <code>null</code> to move the record to the root level of the knowledge base.
 */
export declare function recordsMoveRecord(client$: PipeshubCore, request: MoveRecordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsMoveRecord.d.ts.map