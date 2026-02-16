import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserFullNameRequest } from "../models/updateuserfullnameop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user full name
 *
 * @remarks
 * Update the full name of a user. This is a targeted update endpoint for changing only the display name without affecting other profile fields.<br><br>
 * <b>Overview:</b><br>
 * This endpoint updates a user's fullName field, which is their primary display name throughout the application. The firstName and lastName fields may also be updated based on name parsing logic.<br><br>
 * <b>Authorization:</b><br>
 * <ul>
 * <li><b>Self-update:</b> Users can update their own full name</li>
 * <li><b>Admin-update:</b> Admins can update any user's name</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Updates fullName field</li>
 * <li>May parse and update firstName/lastName</li>
 * <li>User update event published</li>
 * <li>Cached user data invalidated</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>User profile name change</li>
 * <li>Name correction by admin</li>
 * <li>Legal name update</li>
 * </ul>
 */
export declare function usersUpdateUserFullName(client$: PipeshubCore, request: UpdateUserFullNameRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUpdateUserFullName.d.ts.map