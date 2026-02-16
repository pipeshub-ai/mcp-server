import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateUserRequest } from "../models/createuserop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new user
 *
 * @remarks
 * Create a new user account in the organization and optionally send an invitation email.<br><br>
 * <b>Overview:</b><br>
 * This endpoint creates a new user account. The user will be added to the organization but won't have a password set until they complete the invitation flow or are assigned one by an admin.<br><br>
 * <b>Invitation Flow:</b><br>
 * <ol>
 * <li>Admin creates user with this endpoint</li>
 * <li>System generates invitation token</li>
 * <li>User receives invitation email (if sendInvite is true)</li>
 * <li>User clicks link and sets their password</li>
 * <li>User can now log in normally</li>
 * </ol>
 * <b>Validation Rules:</b><br>
 * <ul>
 * <li><code>fullName</code>: Required, 1-100 characters</li>
 * <li><code>email</code>: Required, valid email format, must be unique in org</li>
 * <li><code>mobile</code>: Optional, format: +[country][number] (10-15 digits)</li>
 * <li><code>designation</code>: Optional, job title or role</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>User is automatically added to the "everyone" group</li>
 * <li>Invitation email sent if <code>sendInvite: true</code></li>
 * <li>User creation event published to event bus</li>
 * <li>Audit log entry created</li>
 * </ul>
 * <b>Authorization:</b><br>
 * Only organization administrators can create new users.
 */
export declare function usersCreateUser(client$: PipeshubCore, request: CreateUserRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersCreateUser.d.ts.map