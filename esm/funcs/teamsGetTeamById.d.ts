import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetTeamByIdRequest } from "../models/getteambyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get team by ID
 *
 * @remarks
 * Retrieve detailed information about a specific team.<br><br>
 * <b>Overview:</b><br>
 * Returns complete team details including metadata, member list with roles, and resource information. Use this for team profile pages and detailed views.<br><br>
 * <b>Response Includes:</b><br>
 * <ul>
 * <li>Team metadata (name, description, slug)</li>
 * <li>Owner and creator information</li>
 * <li>Member count and list (with pagination)</li>
 * <li>Team settings and permissions</li>
 * <li>Creation and modification timestamps</li>
 * </ul>
 * <b>Authorization:</b><br>
 * <ul>
 * <li>Team members can view their team</li>
 * <li>Organization admins can view any team</li>
 * </ul>
 */
export declare function teamsGetTeamById(client$: PipeshubCore, request: GetTeamByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsGetTeamById.d.ts.map