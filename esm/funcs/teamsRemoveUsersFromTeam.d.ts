import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RemoveUsersFromTeamRequest } from "../models/removeusersfromteamop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove users from team
 *
 * @remarks
 * Remove one or more users from a team.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Users not in the team are silently skipped</li>
 * <li>Removed users lose access to team resources immediately</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Cannot remove the team owner</li>
 * <li>Only team owner/admin can remove members</li>
 * <li>Admins cannot remove other admins (only owner can)</li>
 * </ul>
 */
export declare function teamsRemoveUsersFromTeam(client$: PipeshubCore, request: RemoveUsersFromTeamRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsRemoveUsersFromTeam.d.ts.map