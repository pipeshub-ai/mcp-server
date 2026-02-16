import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckUserIsAdminRequest } from "../models/checkuserisadminop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check if user is admin
 *
 * @remarks
 * Verify whether a specific user has administrative privileges in the organization.<br><br>
 * <b>Overview:</b><br>
 * This endpoint checks if the specified user belongs to an admin group and has elevated permissions. It's useful for authorization checks before performing admin-only operations.<br><br>
 * <b>What Makes a User an Admin:</b><br>
 * <ul>
 * <li>Member of a group with type "admin"</li>
 * <li>Has explicit admin role assignment</li>
 * <li>Organization owner (always admin)</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>UI permission checks before showing admin features</li>
 * <li>Pre-flight authorization validation</li>
 * <li>Access control for sensitive operations</li>
 * </ul>
 * <b>Response Codes:</b><br>
 * <ul>
 * <li><code>200</code>: User IS an admin</li>
 * <li><code>403</code>: User is NOT an admin</li>
 * </ul>
 */
export declare function usersCheckUserIsAdmin(client$: PipeshubCore, request: CheckUserIsAdminRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersCheckUserIsAdmin.d.ts.map