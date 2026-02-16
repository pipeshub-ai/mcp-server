import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUserGroupByIdRequest } from "../models/getusergroupbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get user group by ID
 *
 * @remarks
 * Retrieve detailed information about a specific user group.<br><br>
 * <b>Response Includes:</b><br>
 * <ul>
 * <li>Group metadata (name, type, description)</li>
 * <li>Member count</li>
 * <li>Creation and modification timestamps</li>
 * <li>Creator information</li>
 * </ul>
 */
export declare function userGroupsGetById(client$: PipeshubCore, request: GetUserGroupByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGetById.d.ts.map