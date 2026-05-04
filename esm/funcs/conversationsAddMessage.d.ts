import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddMessageRequestRequest } from "../models/addmessageop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add message to conversation (non-streaming)
 *
 * @remarks
 * Add a follow-up user message to an existing conversation and wait for
 * the full AI response in a single JSON body. The non-streaming sibling
 * of <code>POST /conversations/{conversationId}/messages/stream</code>.<br><br>
 * <b>Context Handling:</b><br>
 * Prior messages on the persisted conversation are formatted server-side
 * and forwarded to the AI as history — callers do <i>not</i> need to
 * replay messages themselves. Only the new <code>query</code> (and
 * optional model / filter overrides) goes in the request body.<br><br>
 * <b>Response Shape:</b><br>
 * The 200 body is <code>{ conversation, recordsUsed, meta }</code>
 * (modelled by <code>AddMessageResponse</code>). The new <code>user_query</code>
 * and <code>bot_response</code> are appended to
 * <code>conversation.messages</code>; pull the last element for the
 * latest reply. <code>recordsUsed</code> is the number of citations
 * backing the new bot response.<br><br>
 * <b>Model Override:</b><br>
 * Override the model for this turn via <code>modelKey</code>; otherwise
 * the conversation's existing model is used.<br><br>
 * <b>Failure mode:</b><br>
 * On AI backend failure the conversation status flips to
 * <code>Failed</code> with a <code>failReason</code>, a placeholder
 * bot_response is appended, and the endpoint returns 500.
 */
export declare function conversationsAddMessage(client$: PipeshubCore, request: AddMessageRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsAddMessage.d.ts.map