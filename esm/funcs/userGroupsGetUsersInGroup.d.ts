import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUsersInGroupRequest } from "../models/getusersingroupop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get users in a group
 *
 * @remarks
 * Retrieve all users that belong to a specific user group.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Returns user profiles with basic information</li>
 * <li>Supports pagination for large groups</li>
 * <li>Excludes deleted users</li>
 * </ul>
 */
export declare function userGroupsGetUsersInGroup(client$: PipeshubCore, request: GetUsersInGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGetUsersInGroup.d.ts.map