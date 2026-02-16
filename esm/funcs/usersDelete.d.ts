import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteUserRequest } from "../models/deleteuserop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete user
 *
 * @remarks
 * Soft delete a user from the organization. The user account is deactivated but data is retained for audit purposes.<br><br>
 * <b>Overview:</b><br>
 * This endpoint performs a soft delete on a user account. The user is marked as deleted and can no longer access the system, but their data is retained for compliance and audit purposes.<br><br>
 * <b>What Happens on Delete:</b><br>
 * <ol>
 * <li>User's <code>isDeleted</code> flag is set to true</li>
 * <li>User's password is cleared</li>
 * <li>User is removed from all user groups</li>
 * <li>User's active sessions are invalidated</li>
 * <li>User deletion event is published</li>
 * </ol>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Cannot delete organization admins (demote first)</li>
 * <li>Cannot delete the organization owner</li>
 * <li>Cannot delete yourself through this endpoint</li>
 * <li>Cannot delete already-deleted users</li>
 * </ul>
 * <b>Data Retention:</b><br>
 * <ul>
 * <li>User profile data is retained (soft delete)</li>
 * <li>User's documents and content remain with updated ownership</li>
 * <li>Audit logs are preserved</li>
 * <li>Data can be permanently purged by super admin if required</li>
 * </ul>
 * <b>Recovery:</b><br>
 * Deleted users can be restored by organization admins within a configurable retention period.
 */
export declare function usersDelete(client$: PipeshubCore, request: DeleteUserRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersDelete.d.ts.map