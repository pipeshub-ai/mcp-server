import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserGroupRequest } from "../models/updateusergroupop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user group
 *
 * @remarks
 * Update an existing user group's information.<br><br>
 * <b>Updatable Fields:</b><br>
 * <ul>
 * <li><code>name</code> - Display name (must remain unique)</li>
 * <li><code>description</code> - Group description</li>
 * </ul>
 * <b>Note:</b> Group type cannot be changed after creation.
 */
export declare function userGroupsUpdateUserGroup(client$: PipeshubCore, request: UpdateUserGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsUpdateUserGroup.d.ts.map