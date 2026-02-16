import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAllUsersWithGroupsRequest } from "../models/getalluserswithgroupsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all users with their groups
 *
 * @remarks
 * Retrieve all users along with their group memberships in a single optimized query.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns users with their associated groups pre-loaded, eliminating the need for separate group lookup calls. Ideal for admin dashboards that need to display user permissions at a glance.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Admin dashboards showing user-group matrix</li>
 * <li>Permission auditing and compliance checks</li>
 * <li>Bulk user management interfaces</li>
 * <li>Access control visualization</li>
 * </ul>
 * <b>Response Data per User:</b><br>
 * <ul>
 * <li><code>_id</code>: User's unique identifier</li>
 * <li><code>userId</code>: User's public-facing ID</li>
 * <li><code>orgId</code>: Organization identifier</li>
 * <li><code>fullName</code>: User's display name</li>
 * <li><code>hasLoggedIn</code>: Whether user has ever logged in</li>
 * <li><code>groups</code>: Array of group objects with name and type</li>
 * </ul>
 * <b>Group Types Returned:</b><br>
 * <ul>
 * <li><code>admin</code>: Administrative groups with elevated permissions</li>
 * <li><code>standard</code>: Regular user groups</li>
 * <li><code>everyone</code>: Default group containing all org users</li>
 * <li><code>custom</code>: Custom groups created by admins</li>
 * </ul>
 * <b>Performance Notes:</b><br>
 * Uses aggregation pipeline for efficient single-query retrieval. Cached results for improved performance on large organizations.
 */
export declare function usersGetAllUsersWithGroups(client$: PipeshubCore, request?: GetAllUsersWithGroupsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersGetAllUsersWithGroups.d.ts.map