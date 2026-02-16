import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AddMessageRequestRequest } from "../models/addmessageop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Add message to conversation
 *
 * @remarks
 * Add a follow-up message to an existing conversation.<br><br>
 * <b>Overview:</b><br>
 * Continues an existing conversation by adding a new user query.
 * The AI maintains context from previous messages when generating the response.<br><br>
 * <b>Context Handling:</b><br>
 * <ul>
 * <li>Previous messages provide context for the new query</li>
 * <li>Citations from earlier messages may be referenced</li>
 * <li>The AI can refer back to previous topics discussed</li>
 * </ul>
 * <b>Model Override:</b><br>
 * You can specify a different model for this message using <code>modelKey</code>.
 * This allows switching models mid-conversation if needed.
 */
export declare function conversationsAddMessage(client$: PipeshubCore, request: AddMessageRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsAddMessage.d.ts.map