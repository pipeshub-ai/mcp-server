import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteConversationByIdRequest } from "../models/deleteconversationbyidop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete conversation
 *
 * @remarks
 * Delete a conversation by its ID.<br><br>
 * <b>Overview:</b><br>
 * Performs a soft delete by setting <code>isDeleted: true</code>.
 * The conversation is removed from listings but preserved in the database.<br><br>
 * <b>Permissions:</b><br>
 * Only the conversation owner (initiator) can delete it.
 * Shared users cannot delete conversations.
 */
export declare function conversationsDeleteConversationById(client$: PipeshubCore, request: DeleteConversationByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsDeleteConversationById.d.ts.map