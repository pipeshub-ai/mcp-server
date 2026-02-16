import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteTeamRequest } from "../models/deleteteamop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete team
 *
 * @remarks
 * Delete a team from the organization.<br><br>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Team is soft-deleted (isDeleted: true)</li>
 * <li>Team members lose access to team resources</li>
 * <li>Team can be restored by admin if needed</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Only team owner or organization admin can delete</li>
 * <li>Team must have no active resources (configurable)</li>
 * </ul>
 */
export declare function teamsDelete(client$: PipeshubCore, request: DeleteTeamRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=teamsDelete.d.ts.map