import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetConversationByIdRequest } from "../models/getconversationbyidop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get conversation by ID
 *
 * @remarks
 * Retrieve a specific conversation with its full message history.<br><br>
 * <b>Overview:</b><br>
 * Returns the complete conversation including all messages, citations,
 * feedback, and metadata. Messages can be paginated for long conversations.<br><br>
 * <b>Message Pagination:</b><br>
 * For conversations with many messages, use pagination parameters:
 * <ul>
 * <li><code>page</code>: Page number (default: 1)</li>
 * <li><code>limit</code>: Messages per page (default: 10)</li>
 * <li><code>sortBy</code>: Sort field (default: createdAt)</li>
 * <li><code>sortOrder</code>: 'asc' or 'desc' (default: desc)</li>
 * </ul>
 * <b>Access Control:</b><br>
 * Users can access conversations they own or that have been shared with them.
 */
export declare function conversationsGetById(client$: PipeshubCore, request: GetConversationByIdRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsGetById.d.ts.map