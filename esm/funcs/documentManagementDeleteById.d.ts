import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteDocumentByIdRequest } from "../models/deletedocumentbyidop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete document
 *
 * @remarks
 * Soft delete a document from the system. The document is marked as deleted but not permanently removed.<br><br>
 * <b>Overview:</b><br>
 * This endpoint performs a soft delete, marking the document as deleted while preserving its data for potential recovery or audit purposes.<br><br>
 * <b>What Happens on Delete:</b><br>
 * <ul>
 * <li><code>isDeleted</code> flag set to true</li>
 * <li><code>deletedByUserId</code> recorded</li>
 * <li>Document excluded from normal queries</li>
 * <li>File remains in storage (soft delete)</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Document must belong to user's organization</li>
 * <li>User must have appropriate permissions</li>
 * </ul>
 * <b>Recovery:</b><br>
 * Soft-deleted documents can be restored by administrators if needed.
 */
export declare function documentManagementDeleteById(client$: PipeshubCore, request: DeleteDocumentByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentManagementDeleteById.d.ts.map