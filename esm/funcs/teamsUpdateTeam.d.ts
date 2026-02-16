import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateTeamRequest } from "../models/updateteamop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update team
 *
 * @remarks
 * Update team metadata and settings.<br><br>
 * <b>Overview:</b><br>
 * This endpoint allows updating team properties like name and description. Member management is handled through separate endpoints.<br><br>
 * <b>Updatable Fields:</b><br>
 * <ul>
 * <li><code>name</code>: Team display name (must remain unique)</li>
 * <li><code>description</code>: Team description</li>
 * </ul>
 * <b>Authorization:</b><br>
 * <ul>
 * <li><b>Team Owner:</b> Full update access</li>
 * <li><b>Team Admin:</b> Can update name and description</li>
 * <li><b>Org Admin:</b> Can update any team</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Team update event published</li>
 * <li>Team slug may be regenerated if name changes</li>
 * <li>Cached team data invalidated</li>
 * </ul>
 */
export declare function teamsUpdateTeam(client$: PipeshubCore, request: UpdateTeamRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsUpdateTeam.d.ts.map