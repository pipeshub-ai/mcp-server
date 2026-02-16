import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateTeamRequest } from "../models/createteamop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a team
 *
 * @remarks
 * Create a new team within the organization for project collaboration and resource sharing.<br><br>
 * <b>Overview:</b><br>
 * Teams are collaborative units that group users together for specific projects, departments, or initiatives. Teams have their own resources, permissions, and member hierarchies.<br><br>
 * <b>Team Structure:</b><br>
 * <ul>
 * <li><b>Owner:</b> Creator of the team, full administrative control</li>
 * <li><b>Admins:</b> Can manage members and settings</li>
 * <li><b>Members:</b> Standard access to team resources</li>
 * <li><b>Viewers:</b> Read-only access</li>
 * </ul>
 * <b>What Gets Created:</b><br>
 * <ul>
 * <li>Team entity with unique identifier</li>
 * <li>Owner role automatically assigned to creator</li>
 * <li>Team workspace for shared resources</li>
 * <li>Default permission settings</li>
 * </ul>
 * <b>Initial Members:</b><br>
 * You can optionally add initial members with their roles during creation using the <code>userRoles</code> array.<br><br>
 * <b>Validation:</b><br>
 * <ul>
 * <li>Team name is required and must be unique in the org</li>
 * <li>Name: 1-100 characters</li>
 * <li>Description: Optional, max 500 characters</li>
 * </ul>
 */
export declare function teamsCreateTeam(client$: PipeshubCore, request: CreateTeamRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsCreateTeam.d.ts.map