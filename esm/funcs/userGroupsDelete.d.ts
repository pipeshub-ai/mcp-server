import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteUserGroupRequest } from "../models/deleteusergroupop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete user group
 *
 * @remarks
 * Soft delete a user group.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Group is marked as deleted (isDeleted: true)</li>
 * <li>Group members are not affected</li>
 * <li>Group can be restored by admin if needed</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Cannot delete system groups (admin, everyone)</li>
 * <li>Requires admin privileges</li>
 * </ul>
 */
export declare function userGroupsDelete(client$: PipeshubCore, request: DeleteUserGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsDelete.d.ts.map