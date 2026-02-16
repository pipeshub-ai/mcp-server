import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { QueryServiceChatRequest } from "../models/queryservicechatop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] Chat with knowledge base
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Conversational AI endpoint with RAG (Retrieval-Augmented Generation).<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>
 *
 * <b>Features:</b><br>
 * <ul>
 * <li>Multi-turn conversation support</li>
 * <li>Context from knowledge base</li>
 * <li>Citation of source documents</li>
 * <li>Multiple chat modes (quick, analysis, deep_research, creative, precise)</li>
 * <li>Multi-model support (OpenAI, Anthropic, Ollama, etc.)</li>
 * </ul>
 */
export declare function queryServiceQueryServiceChat(client$: PipeshubCore, request: QueryServiceChatRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceQueryServiceChat.d.ts.map