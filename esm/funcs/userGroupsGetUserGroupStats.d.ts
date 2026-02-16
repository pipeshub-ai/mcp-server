import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get user group statistics
 *
 * @remarks
 * Retrieve statistics for all user groups in the organization.<br><br>
 * <b>Statistics Include:</b><br>
 * <ul>
 * <li>Total number of groups by type</li>
 * <li>Member counts per group</li>
 * <li>Active vs deleted groups</li>
 * <li>Recently created/modified groups</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Admin dashboard displays</li>
 * <li>Organization analytics</li>
 * <li>Capacity planning</li>
 * </ul>
 */
export declare function userGroupsGetUserGroupStats(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGetUserGroupStats.d.ts.map