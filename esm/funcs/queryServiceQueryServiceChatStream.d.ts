import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] Streaming chat with knowledge base
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Streaming conversational AI endpoint with real-time token delivery.<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>
 *
 * <b>SSE Events:</b><br>
 * <ul>
 * <li><code>status</code>: Processing status updates</li>
 * <li><code>chunk</code>: Token/text chunks</li>
 * <li><code>citations</code>: Source citations</li>
 * <li><code>done</code>: Stream complete</li>
 * <li><code>error</code>: Error occurred</li>
 * </ul>
 */
export declare function queryServiceQueryServiceChatStream(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceQueryServiceChatStream.d.ts.map