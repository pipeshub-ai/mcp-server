import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { QueryServiceSearchRequest } from "../models/queryservicesearchop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Query Service] Semantic search
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Perform semantic search across indexed documents using vector embeddings.<br><br>
 *
 * <b>Service:</b> Query Service<br>
 * <b>Port:</b> 8000<br>
 * <b>Base URL:</b> <code>http://localhost:8000</code><br><br>
 *
 * <b>Authentication:</b> Requires user JWT token (proxied from main API) or scoped service token<br><br>
 *
 * <b>How It Works:</b><br>
 * <ol>
 * <li>Query is transformed and expanded using LLM</li>
 * <li>Embeddings are generated for search queries</li>
 * <li>Vector similarity search in Qdrant</li>
 * <li>Results filtered by user permissions</li>
 * <li>Optional knowledge base filtering</li>
 * </ol>
 */
export declare function queryServiceSearch(client$: PipeshubCore, request: QueryServiceSearchRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=queryServiceSearch.d.ts.map