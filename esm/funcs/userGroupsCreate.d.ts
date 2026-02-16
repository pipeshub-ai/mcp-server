import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateUserGroupRequest } from "../models/createusergroupop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create user group
 *
 * @remarks
 * Create a new user group within the organization.<br><br>
 * <b>Group Types:</b><br>
 * <ul>
 * <li><code>admin</code> - Administrative group with elevated privileges</li>
 * <li><code>standard</code> - Regular user group</li>
 * <li><code>everyone</code> - Automatically includes all organization users</li>
 * <li><code>custom</code> - Custom group with manual membership management</li>
 * </ul>
 * <b>Validation Rules:</b><br>
 * <ul>
 * <li>Group name must be unique within the organization</li>
 * <li>Group name is required and cannot be empty</li>
 * <li>Type must be one of the allowed values</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Creates a unique slug from the group name</li>
 * <li>Sets createdBy to the authenticated user</li>
 * </ul>
 */
export declare function userGroupsCreate(client$: PipeshubCore, request: CreateUserGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsCreate.d.ts.map