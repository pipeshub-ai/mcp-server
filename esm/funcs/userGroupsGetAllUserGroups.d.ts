import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAllUserGroupsRequest } from "../models/getallusergroupsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all user groups
 *
 * @remarks
 * Retrieve all user groups in the organization.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Returns all groups including admin, standard, everyone, and custom types</li>
 * <li>Groups are returned with their member counts</li>
 * <li>Soft-deleted groups are excluded by default</li>
 * <li>Each user in the <code>users</code> array is returned as an object with <code>_id</code> and <code>profilePicture</code> (base64 data URI or null)</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Populating group selection dropdowns</li>
 * <li>Managing group memberships</li>
 * <li>Access control configuration</li>
 * <li>Rendering user avatars in group member lists</li>
 * </ul>
 */
export declare function userGroupsGetAllUserGroups(client$: PipeshubCore, request?: GetAllUserGroupsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGetAllUserGroups.d.ts.map