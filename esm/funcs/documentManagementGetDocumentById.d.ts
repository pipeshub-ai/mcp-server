import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetDocumentByIdRequest } from "../models/getdocumentbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get document by ID
 *
 * @remarks
 * Retrieve complete document metadata by its unique identifier.<br><br>
 * <b>Overview:</b><br>
 * Returns all document information including metadata, version history, storage location, and access permissions. Use this to display document details or prepare for download/edit operations.<br><br>
 * <b>Response Includes:</b><br>
 * <ul>
 * <li>Document metadata (name, path, size, type)</li>
 * <li>Storage information (vendor, URLs)</li>
 * <li>Version history (if versioned)</li>
 * <li>Permission settings</li>
 * <li>Custom metadata</li>
 * <li>Timestamps (created, updated)</li>
 * </ul>
 * <b>Authorization:</b><br>
 * Document must belong to the requesting user's organization.<br><br>
 * <b>Note:</b> Soft-deleted documents (isDeleted: true) are not returned.
 */
export declare function documentManagementGetDocumentById(client$: PipeshubCore, request: GetDocumentByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=documentManagementGetDocumentById.d.ts.map