import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ResendUserInviteRequest } from "../models/resenduserinviteop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Resend user invite
 *
 * @remarks
 * Resend the invitation email to a user who hasn't completed their account setup.<br><br>
 * <b>Overview:</b><br>
 * This endpoint resends the invitation email to a user who was previously invited but hasn't logged in yet. Useful when the original invitation email was lost, expired, or ended up in spam.<br><br>
 * <b>When to Use:</b><br>
 * <ul>
 * <li>User didn't receive original invitation</li>
 * <li>Invitation link expired</li>
 * <li>User forgot to complete setup</li>
 * <li>Email went to spam folder</li>
 * </ul>
 * <b>Requirements:</b><br>
 * <ul>
 * <li>User must exist in the system</li>
 * <li>User must NOT have logged in yet (hasLoggedIn: false)</li>
 * <li>SMTP configuration must be active</li>
 * <li>Admin privileges required</li>
 * </ul>
 * <b>What Happens:</b><br>
 * <ul>
 * <li>Generates a new invitation token</li>
 * <li>Invalidates any previous invitation links</li>
 * <li>Sends new invitation email</li>
 * <li>Resets invitation expiry timer</li>
 * </ul>
 */
export declare function usersResendInvite(client$: PipeshubCore, request: ResendUserInviteRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersResendInvite.d.ts.map