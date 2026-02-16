import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserLastNameRequest } from "../models/updateuserlastnameop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user last name
 *
 * @remarks
 * Update only the last name of a user without affecting other profile fields.<br><br>
 * <b>Overview:</b><br>
 * This targeted endpoint updates just the lastName field. Useful for fine-grained control over name components.<br><br>
 * <b>Authorization:</b><br>
 * <ul>
 * <li><b>Self-update:</b> Users can update their own last name</li>
 * <li><b>Admin-update:</b> Admins can update any user's last name</li>
 * </ul>
 * <b>Note:</b> This does NOT automatically update the fullName field. Use <code>/users/{id}/fullname</code> if you need to update the complete display name.
 */
export declare function usersUpdateLastName(client$: PipeshubCore, request: UpdateUserLastNameRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUpdateLastName.d.ts.map