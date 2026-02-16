import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List all conversations
 *
 * @remarks
 * Retrieve all conversations for the authenticated user.<br><br>
 * <b>Overview:</b><br>
 * Returns a list of all conversations owned by or shared with the current user.
 * Conversations are returned with their messages, status, and metadata.<br><br>
 * <b>Filtering:</b><br>
 * <ul>
 * <li>Only non-archived conversations are returned by default</li>
 * <li>Use <code>/conversations/show/archives</code> for archived conversations</li>
 * </ul>
 * <b>Sorting:</b><br>
 * Conversations are sorted by last activity timestamp (most recent first).
 */
export declare function conversationsList(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsList.d.ts.map