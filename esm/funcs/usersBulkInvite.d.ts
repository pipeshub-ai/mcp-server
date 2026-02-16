import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { BulkInviteUsersRequest } from "../models/bulkinviteusersop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Bulk invite users
 *
 * @remarks
 * Invite multiple users to the organization in a single operation. Ideal for onboarding entire teams at once.<br><br>
 * <b>Overview:</b><br>
 * This endpoint creates user accounts for multiple email addresses and sends invitation emails to all of them. It's the most efficient way to add multiple users to your organization.<br><br>
 * <b>Invitation Flow:</b><br>
 * <ol>
 * <li>Validate all email addresses</li>
 * <li>Check for existing accounts (skip duplicates)</li>
 * <li>Create user accounts for new emails</li>
 * <li>Restore any previously deleted accounts</li>
 * <li>Add users to specified groups (optional)</li>
 * <li>Send invitation emails to all new users</li>
 * </ol>
 * <b>Requirements:</b><br>
 * <ul>
 * <li><b>Account Type:</b> Business accounts only (not individual)</li>
 * <li><b>SMTP:</b> Email configuration must be set up</li>
 * <li><b>Authorization:</b> Admin privileges required</li>
 * </ul>
 * <b>Email Processing:</b><br>
 * <ul>
 * <li>Duplicate emails are automatically skipped</li>
 * <li>Invalid email formats are rejected</li>
 * <li>Existing users are not re-invited (use resend-invite)</li>
 * <li>Previously deleted users are restored</li>
 * </ul>
 * <b>Response Details:</b><br>
 * Response includes count of successful invites and any failures with reasons.
 */
export declare function usersBulkInvite(client$: PipeshubCore, request: BulkInviteUsersRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersBulkInvite.d.ts.map