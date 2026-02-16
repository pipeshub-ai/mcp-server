import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddUsersToTeamRequest } from "../models/adduserstoteamop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add users to team
 *
 * @remarks
 * Add one or more users to a team with specified roles.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Users already in the team are skipped</li>
 * <li>Default role is "member" if not specified</li>
 * <li>Sends invitation notification to added users</li>
 * </ul>
 * <b>Validation:</b><br>
 * <ul>
 * <li>All user IDs must be valid and from the same organization</li>
 * <li>Role must be one of the allowed values</li>
 * <li>Only team owner/admin can add members</li>
 * </ul>
 */
export declare function teamsAddUsersToTeam(client$: PipeshubCore, request: AddUsersToTeamRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsAddUsersToTeam.d.ts.map