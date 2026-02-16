import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListTeamsRequest } from "../models/listteamsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List teams
 *
 * @remarks
 * Retrieve all teams in the organization with optional search and pagination.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns teams the authenticated user can access. Admins see all teams; regular users see teams they're members of.<br><br>
 * <b>Response Data per Team:</b><br>
 * <ul>
 * <li>Team metadata (name, description)</li>
 * <li>Member count</li>
 * <li>Owner information</li>
 * <li>Creation timestamp</li>
 * </ul>
 * <b>Search:</b><br>
 * The search parameter performs fuzzy matching on team names and descriptions.<br><br>
 * <b>Visibility Rules:</b><br>
 * <ul>
 * <li><b>Admins:</b> See all organization teams</li>
 * <li><b>Users:</b> See only teams they belong to</li>
 * </ul>
 * <b>Sorting:</b><br>
 * Results are sorted by name alphabetically by default.
 */
export declare function teamsList(client$: PipeshubCore, request?: ListTeamsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsList.d.ts.map