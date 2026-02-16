import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetUserEmailByIdRequest } from "../models/getuseremailbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get user email by ID
 *
 * @remarks
 * Retrieve the email address for a specific user. This is a dedicated endpoint for email lookup with proper access controls.<br><br>
 * <b>Overview:</b><br>
 * This endpoint provides direct access to a user's email address. It exists separately from the main user endpoint to allow granular permission control over email visibility.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Admin communication workflows</li>
 * <li>Invitation and notification systems</li>
 * <li>Email-based user lookup</li>
 * <li>Contact information export</li>
 * </ul>
 * <b>Privacy Considerations:</b><br>
 * <ul>
 * <li>Only organization admins can access this endpoint</li>
 * <li>Access is logged for audit purposes</li>
 * <li>Consider GDPR/privacy regulations when exposing emails</li>
 * </ul>
 * <b>Authorization:</b><br>
 * Requires admin privileges. Regular users should use the main user endpoint which may mask emails based on organization settings.
 */
export declare function usersGetEmailById(client$: PipeshubCore, request: GetUserEmailByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersGetEmailById.d.ts.map