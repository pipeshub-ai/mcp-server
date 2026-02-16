import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateConversationTitleRequest } from "../models/updateconversationtitleop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update conversation title
 *
 * @remarks
 * Update the title of a conversation.<br><br>
 * <b>Overview:</b><br>
 * Conversation titles are auto-generated from the first query by default.
 * Use this endpoint to set a custom, more descriptive title.<br><br>
 * <b>Title Limits:</b><br>
 * <ul>
 * <li>Minimum: 1 character</li>
 * <li>Maximum: 200 characters</li>
 * </ul>
 */
export declare function conversationsUpdateTitle(client$: PipeshubCore, request: UpdateConversationTitleRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsUpdateTitle.d.ts.map