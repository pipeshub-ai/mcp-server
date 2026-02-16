import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetTeamUsersRequest } from "../models/getteamusersop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get team members
 *
 * @remarks
 * Retrieve all users that are members of a specific team.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Returns user profiles with their team role</li>
 * <li>Supports pagination for large teams</li>
 * <li>Excludes deleted or inactive users</li>
 * </ul>
 * <b>Team Roles:</b><br>
 * <ul>
 * <li><code>owner</code> - Full control over team settings and members</li>
 * <li><code>admin</code> - Can manage members and most settings</li>
 * <li><code>member</code> - Standard team member</li>
 * <li><code>viewer</code> - Read-only access to team resources</li>
 * </ul>
 */
export declare function teamsGetTeamUsers(client$: PipeshubCore, request: GetTeamUsersRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsGetTeamUsers.d.ts.map