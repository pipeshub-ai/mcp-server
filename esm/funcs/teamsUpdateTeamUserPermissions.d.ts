import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateTeamUserPermissionsRequest } from "../models/updateteamuserpermissionsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user role in team
 *
 * @remarks
 * Update a user's role/permissions within a team.<br><br>
 * <b>Available Roles:</b><br>
 * <ul>
 * <li><code>owner</code> - Full control (only one per team, transferable)</li>
 * <li><code>admin</code> - Can manage members and settings</li>
 * <li><code>member</code> - Standard access</li>
 * <li><code>viewer</code> - Read-only access</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Only team owner can promote to admin</li>
 * <li>Only team owner can transfer ownership</li>
 * <li>Admins can modify member/viewer roles</li>
 * </ul>
 */
export declare function teamsUpdateTeamUserPermissions(client$: PipeshubCore, request: UpdateTeamUserPermissionsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsUpdateTeamUserPermissions.d.ts.map