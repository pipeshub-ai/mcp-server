import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ShareConversationRequest } from "../models/shareconversationop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Share conversation with users
 *
 * @remarks
 * Share a conversation with other users in your organization.<br><br>
 * <b>Overview:</b><br>
 * Allows the conversation owner to grant access to other users.
 * Shared users can view the conversation and optionally add messages.<br><br>
 * <b>Access Levels:</b><br>
 * <ul>
 * <li><code>read</code> - Can view conversation and messages (default)</li>
 * <li><code>write</code> - Can view and add new messages</li>
 * </ul>
 * <b>Permissions:</b><br>
 * Only the conversation initiator (owner) can share. Users must belong
 * to the same organization.
 */
export declare function conversationsShareConversation(client$: PipeshubCore, request: ShareConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsShareConversation.d.ts.map