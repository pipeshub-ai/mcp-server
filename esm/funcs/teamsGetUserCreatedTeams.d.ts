import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUserCreatedTeamsRequest } from "../models/getusercreatedteamsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get teams created by current user
 *
 * @remarks
 * Retrieve all teams that were created by the authenticated user.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Only includes teams where user is the original creator</li>
 * <li>User may or may not still be the owner (ownership can be transferred)</li>
 * <li>Useful for tracking team creation history</li>
 * </ul>
 */
export declare function teamsGetUserCreatedTeams(client$: PipeshubCore, request?: GetUserCreatedTeamsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsGetUserCreatedTeams.d.ts.map