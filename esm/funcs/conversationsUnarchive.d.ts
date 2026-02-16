import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UnarchiveConversationRequest } from "../models/unarchiveconversationop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Unarchive conversation
 *
 * @remarks
 * Restore an archived conversation to the active list.<br><br>
 * <b>Overview:</b><br>
 * Removes the archived flag, making the conversation visible in the main list again.
 */
export declare function conversationsUnarchive(client$: PipeshubCore, request: UnarchiveConversationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsUnarchive.d.ts.map