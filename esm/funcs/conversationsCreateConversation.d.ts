import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateConversationRequest } from "../models/createconversationrequest.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new AI conversation (non-streaming)
 *
 * @remarks
 * Start a new conversation with PipesHub's AI assistant and wait for the
 * full response in a single JSON body. For an interactive / token-by-token
 * experience use <code>POST /conversations/stream</code> instead;
 * the request body is identical.<br><br>
 * <b>How It Works:</b><br>
 * <ol>
 * <li>Your query is analyzed and converted to semantic embeddings</li>
 * <li>Relevant content is retrieved from indexed knowledge bases</li>
 * <li>The AI generates a response using the retrieved context</li>
 * <li>Citations link back to source documents for verification</li>
 * <li>Follow-up questions are suggested based on the conversation</li>
 * </ol>
 * <b>Response Shape:</b><br>
 * The 201 body is <code>{ conversation, meta }</code> — the same payload
 * as the SSE <code>complete</code> frame from
 * <code>/conversations/stream</code> (modelled by
 * <code>SSECompleteData</code>). The user query and the AI's response are
 * both persisted as messages on <code>conversation.messages</code>;
 * citations are populated under each bot message.<br><br>
 * <b>Filtering Options:</b><br>
 * <ul>
 * <li><b>recordIds:</b> Limit search to specific documents</li>
 * <li><b>filters.apps:</b> Search only specific connector apps</li>
 * <li><b>filters.kb:</b> Search only specific knowledge bases</li>
 * </ul>
 * <b>Model Selection:</b><br>
 * Use <code>modelKey</code> to select different AI models configured for
 * your organization. Each model may have different capabilities, speed,
 * and accuracy trade-offs.<br><br>
 * <b>Failure mode:</b><br>
 * On AI backend failure the conversation is still persisted (with
 * <code>status = "Failed"</code> and a <code>failReason</code>) and the
 * endpoint returns a 500 with a JSON error body. Callers can correlate
 * with the persisted record via <code>conversationId</code> if they
 * retain it from logs.
 */
export declare function conversationsCreateConversation(client$: PipeshubCore, request: CreateConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsCreateConversation.d.ts.map