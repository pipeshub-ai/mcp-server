import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get all user groups
 *
 * @remarks
 * Retrieve all user groups in the organization.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Returns all groups including admin, standard, everyone, and custom types</li>
 * <li>Groups are returned with their member counts</li>
 * <li>Soft-deleted groups are excluded by default</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Populating group selection dropdowns</li>
 * <li>Managing group memberships</li>
 * <li>Access control configuration</li>
 * </ul>
 */
export declare function userGroupsGet(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userGroupsGet.d.ts.map