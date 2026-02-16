import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAllUsersRequest } from "../models/getallusersop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all users
 *
 * @remarks
 * Retrieve a paginated list of all users in the organization.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns all active users in your organization. It's the primary endpoint for listing and displaying users in admin dashboards, user directories, and selection interfaces.<br><br>
 * <b>Response Data:</b><br>
 * <ul>
 * <li>User profile information (name, email, designation)</li>
 * <li>Account status (active, pending invitation, disabled)</li>
 * <li>Login history (hasLoggedIn flag)</li>
 * <li>Timestamps (createdAt, updatedAt)</li>
 * </ul>
 * <b>Privacy Controls:</b><br>
 * <ul>
 * <li>Email addresses may be masked based on organization settings</li>
 * <li>Sensitive fields (password, tokens) are never exposed</li>
 * <li>Deleted users are excluded from results</li>
 * </ul>
 * <b>Performance Notes:</b><br>
 * <ul>
 * <li>Results are cached for improved performance</li>
 * <li>For large organizations, consider using pagination</li>
 * <li>Use <code>/users/by-ids</code> for fetching specific users</li>
 * </ul>
 */
export declare function usersList(client$: PipeshubCore, request?: GetAllUsersRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersList.d.ts.map