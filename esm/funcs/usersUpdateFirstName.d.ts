import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserFirstNameRequest } from "../models/updateuserfirstnameop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user first name
 *
 * @remarks
 * Update only the first name of a user without affecting other profile fields.<br><br>
 * <b>Overview:</b><br>
 * This targeted endpoint updates just the firstName field. Useful when you need fine-grained control over name components rather than updating the full name.<br><br>
 * <b>Authorization:</b><br>
 * <ul>
 * <li><b>Self-update:</b> Users can update their own first name</li>
 * <li><b>Admin-update:</b> Admins can update any user's first name</li>
 * </ul>
 * <b>Note:</b> This does NOT automatically update the fullName field. Use <code>/users/{id}/fullname</code> if you need to update the complete display name.
 */
export declare function usersUpdateFirstName(client$: PipeshubCore, request: UpdateUserFirstNameRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUpdateFirstName.d.ts.map