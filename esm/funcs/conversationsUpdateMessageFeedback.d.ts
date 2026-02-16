import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateMessageFeedbackRequest } from "../models/updatemessagefeedbackop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Submit feedback on AI response
 *
 * @remarks
 * Provide feedback on an AI-generated response.<br><br>
 * <b>Overview:</b><br>
 * Feedback helps improve AI response quality over time. You can rate
 * various aspects of the response and provide detailed comments.<br><br>
 * <b>Feedback Options:</b><br>
 * <ul>
 * <li><b>isHelpful:</b> Overall thumbs up/down</li>
 * <li><b>ratings:</b> 1-5 scale for accuracy, relevance, completeness, clarity</li>
 * <li><b>categories:</b> Issue categories (incorrect info, too verbose, etc.)</li>
 * <li><b>comments:</b> Free-text positive/negative feedback and suggestions</li>
 * <li><b>citationFeedback:</b> Rate individual citations</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * Feedback can only be submitted on <code>bot_response</code> messages,
 * not on user queries or system messages.
 */
export declare function conversationsUpdateMessageFeedback(client$: PipeshubCore, request: UpdateMessageFeedbackRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=conversationsUpdateMessageFeedback.d.ts.map