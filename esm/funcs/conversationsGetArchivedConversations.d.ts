import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List archived conversations
 *
 * @remarks
 * Retrieve all archived conversations for the authenticated user.<br><br>
 * <b>Overview:</b><br>
 * Archived conversations are hidden from the main list but preserved for reference.
 * This endpoint returns only conversations where <code>isArchived: true</code>.<br><br>
 * <b>Unarchiving:</b><br>
 * Use <code>PATCH /conversations/{id}/unarchive</code> to restore a conversation
 * to the active list.
 */
export declare function conversationsGetArchivedConversations(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsGetArchivedConversations.d.ts.map