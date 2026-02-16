import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUserByIdRequest } from "../models/getuserbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get user by ID
 *
 * @remarks
 * Retrieve detailed information about a specific user by their unique identifier.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns the complete user profile for the specified user ID. Use this to display user details in profiles, settings pages, or when you need full user information.<br><br>
 * <b>Response Data:</b><br>
 * <ul>
 * <li>Basic info: fullName, firstName, lastName, email</li>
 * <li>Contact: mobile, address</li>
 * <li>Professional: designation</li>
 * <li>Status: hasLoggedIn, isDeleted, accountStatus</li>
 * <li>Metadata: createdAt, updatedAt, createdBy</li>
 * </ul>
 * <b>Privacy Notes:</b><br>
 * <ul>
 * <li>Email may be masked for non-admin users based on org settings</li>
 * <li>Password and sensitive tokens are never returned</li>
 * <li>Display picture URL returned if set</li>
 * </ul>
 * <b>Related Endpoints:</b><br>
 * <ul>
 * <li><code>GET /users/{id}/email</code> - Get just the email (admin only)</li>
 * <li><code>GET /users/fetch/with-groups</code> - Get user with group memberships</li>
 * </ul>
 */
export declare function usersGetUserById(client$: PipeshubCore, request: GetUserByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersGetUserById.d.ts.map