import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateKnowledgeBaseRequest } from "../models/updateknowledgebaseop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update knowledge base
 *
 * @remarks
 * Update a knowledge base's name.<br><br>
 * <b>Required Permission:</b> OWNER or ORGANIZER<br><br>
 * <b>Validation:</b><br>
 * <ul>
 * <li>Name must be 1-255 characters</li>
 * <li>XSS protection applied to input</li>
 * </ul>
 */
export declare function knowledgeBasesUpdateKnowledgeBase(client$: PipeshubCore, request: UpdateKnowledgeBaseRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesUpdateKnowledgeBase.d.ts.map