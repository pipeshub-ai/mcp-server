import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateRecordRequest } from "../models/updaterecordop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update record
 *
 * @remarks
 * Update a record's name and/or file content.<br><br>
 * <b>Overview:</b><br>
 * Allows updating the display name and optionally replacing the file content. Triggers re-indexing when content changes.<br><br>
 * <b>Required Permission:</b> WRITER or higher<br><br>
 * <b>Updating File Content:</b><br>
 * Include a new file in the request to replace the existing content. The file extension must match the original.<br><br>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Updates <code>updatedAtTimestamp</code></li>
 * <li>Increments version if file content changed</li>
 * <li>Triggers re-indexing for content changes</li>
 * </ul>
 */
export declare function recordsUpdateRecord(client$: PipeshubCore, request: UpdateRecordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsUpdateRecord.d.ts.map