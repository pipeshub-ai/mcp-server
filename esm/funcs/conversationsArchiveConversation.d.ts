import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ArchiveConversationRequest } from "../models/archiveconversationop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Archive conversation
 *
 * @remarks
 * Archive a conversation to hide it from the main list.<br><br>
 * <b>Overview:</b><br>
 * Archived conversations are preserved but hidden from the default conversation list.
 * Use archiving to clean up your workspace without permanently deleting conversations.<br><br>
 * <b>Retrieval:</b><br>
 * View archived conversations using <code>GET /conversations/show/archives</code>.
 */
export declare function conversationsArchiveConversation(client$: PipeshubCore, request: ArchiveConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsArchiveConversation.d.ts.map