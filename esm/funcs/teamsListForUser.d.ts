import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUserTeamsRequest } from "../models/getuserteamsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get current user's teams
 *
 * @remarks
 * Retrieve all teams that the authenticated user is a member of.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Includes teams where user is owner, admin, member, or viewer</li>
 * <li>Returns user's role in each team</li>
 * <li>Sorted by most recently accessed</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Populating team switcher in UI</li>
 * <li>Dashboard team list</li>
 * <li>Access control checks</li>
 * </ul>
 */
export declare function teamsListForUser(client$: PipeshubCore, request?: GetUserTeamsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsListForUser.d.ts.map