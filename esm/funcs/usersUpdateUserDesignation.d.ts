import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserDesignationRequest } from "../models/updateuserdesignationop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user designation
 *
 * @remarks
 * Update the job title or designation of a user.<br><br>
 * <b>Overview:</b><br>
 * This endpoint updates the user's designation field, which typically represents their job title, role, or position within the organization.<br><br>
 * <b>Authorization:</b><br>
 * <ul>
 * <li><b>Self-update:</b> Users can update their own designation</li>
 * <li><b>Admin-update:</b> Admins can update any user's designation</li>
 * </ul>
 * <b>Common Values:</b><br>
 * <ul>
 * <li>Software Engineer</li>
 * <li>Product Manager</li>
 * <li>Team Lead</li>
 * <li>Director of Engineering</li>
 * </ul>
 * <b>Display:</b><br>
 * Designation is shown in user profiles, team views, and organizational charts.
 */
export declare function usersUpdateUserDesignation(client$: PipeshubCore, request: UpdateUserDesignationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUpdateUserDesignation.d.ts.map