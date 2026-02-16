import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateConversationRequest } from "../models/createconversationrequest.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new AI conversation
 *
 * @remarks
 * Start a new conversation with PipesHub's AI assistant.<br><br>
 * <b>Overview:</b><br>
 * This endpoint creates a new conversation session and processes the initial query.
 * The AI searches your organization's knowledge bases for relevant information and
 * generates a response with citations to source documents.<br><br>
 * <b>How It Works:</b><br>
 * <ol>
 * <li>Your query is analyzed and converted to semantic embeddings</li>
 * <li>Relevant content is retrieved from indexed knowledge bases</li>
 * <li>The AI generates a response using the retrieved context</li>
 * <li>Citations link back to source documents for verification</li>
 * <li>Follow-up questions are suggested based on the conversation</li>
 * </ol>
 * <b>Filtering Options:</b><br>
 * <ul>
 * <li><b>recordIds:</b> Limit search to specific documents</li>
 * <li><b>filters.apps:</b> Search only specific connector apps</li>
 * <li><b>filters.kb:</b> Search only specific knowledge bases</li>
 * </ul>
 * <b>Model Selection:</b><br>
 * Use <code>modelKey</code> to select different AI models configured for your organization.
 * Each model may have different capabilities, speed, and accuracy trade-offs.
 */
export declare function conversationsCreate(client$: PipeshubCore, request: CreateConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsCreate.d.ts.map