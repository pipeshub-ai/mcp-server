import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddUsersToGroupRequest } from "../models/adduserstogroupop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add users to group
 *
 * @remarks
 * Add one or more users to a user group.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Users already in the group are silently skipped</li>
 * <li>Invalid user IDs are reported in the response</li>
 * <li>Operation is atomic - all valid users are added together</li>
 * </ul>
 * <b>Validation:</b><br>
 * <ul>
 * <li>All user IDs must be valid MongoDB ObjectIds</li>
 * <li>Users must belong to the same organization</li>
 * <li>Group must exist and not be deleted</li>
 * </ul>
 */
export declare function userGroupsAddUsersToGroup(client$: PipeshubCore, request: AddUsersToGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsAddUsersToGroup.d.ts.map