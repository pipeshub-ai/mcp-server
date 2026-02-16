import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetGroupsForUserRequest } from "../models/getgroupsforuserop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get groups for a user
 *
 * @remarks
 * Retrieve all user groups that a specific user belongs to.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Includes all group types (admin, standard, everyone, custom)</li>
 * <li>Returns group metadata for each membership</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Displaying user's group memberships in profile</li>
 * <li>Access control checks</li>
 * <li>Permission inheritance calculations</li>
 * </ul>
 */
export declare function userGroupsGetForUser(client$: PipeshubCore, request: GetGroupsForUserRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGetForUser.d.ts.map