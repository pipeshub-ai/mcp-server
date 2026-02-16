import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateUserRequest } from "../models/updateuserop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update user
 *
 * @remarks
 * Update user profile information. Users can update their own profile, admins can update any user.<br><br>
 * <b>Overview:</b><br>
 * This endpoint allows updating user profile fields. The scope of allowed updates depends on the requester's role and relationship to the user being updated.<br><br>
 * <b>Authorization Matrix:</b><br>
 * <ul>
 * <li><b>Self-update:</b> Users can update their own fullName, mobile, designation, address</li>
 * <li><b>Admin-update:</b> Admins can update any field for any user</li>
 * <li><b>Email changes:</b> Require admin privileges and trigger re-verification</li>
 * </ul>
 * <b>Updatable Fields:</b><br>
 * <ul>
 * <li><code>fullName</code>: Display name (also updates firstName/lastName if parsed)</li>
 * <li><code>firstName</code>: First name only</li>
 * <li><code>lastName</code>: Last name only</li>
 * <li><code>email</code>: Email address (admin only, triggers verification)</li>
 * <li><code>mobile</code>: Phone number with country code</li>
 * <li><code>designation</code>: Job title</li>
 * <li><code>address</code>: Full address object</li>
 * </ul>
 * <b>Validation Rules:</b><br>
 * <ul>
 * <li>Email must be unique within the organization</li>
 * <li>Mobile must match pattern: +[country][number]</li>
 * <li>Name fields: 1-100 characters</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>User update event published to event bus</li>
 * <li>Audit log entry created for admin updates</li>
 * <li>Email change triggers verification email</li>
 * </ul>
 */
export declare function usersUpdateUser(client$: PipeshubCore, request: UpdateUserRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUpdateUser.d.ts.map