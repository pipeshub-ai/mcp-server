import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RemoveUsersFromGroupRequest } from "../models/removeusersfromgroupop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove users from group
 *
 * @remarks
 * Remove one or more users from a user group.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Users not in the group are silently skipped</li>
 * <li>Operation is atomic - all specified users are removed together</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Cannot remove users from "everyone" group type</li>
 * <li>Cannot remove the last admin from admin group</li>
 * </ul>
 */
export declare function userGroupsRemoveUsersFromGroup(client$: PipeshubCore, request: RemoveUsersFromGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsRemoveUsersFromGroup.d.ts.map