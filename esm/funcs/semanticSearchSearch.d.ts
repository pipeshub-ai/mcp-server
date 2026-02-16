import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SemanticSearchRequest } from "../models/semanticsearchrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Perform semantic search
 *
 * @remarks
 * Execute a semantic search across your organization's knowledge base.<br><br>
 * <b>Overview:</b><br>
 * Semantic search uses AI embeddings to find content based on meaning,
 * not just keyword matching. This enables finding relevant information
 * even when the exact words differ.<br><br>
 * <b>How It Works:</b><br>
 * <ol>
 * <li>Your query is converted to a vector embedding</li>
 * <li>The system finds documents with similar semantic meaning</li>
 * <li>Results are ranked by relevance score</li>
 * <li>Matching chunks are returned with metadata</li>
 * </ol>
 * <b>Filtering:</b><br>
 * Use filters to narrow your search:
 * <ul>
 * <li><code>filters.apps</code>: Limit to specific connector apps (Google Drive, Confluence, etc.)</li>
 * <li><code>filters.kb</code>: Limit to specific knowledge bases</li>
 * </ul>
 * <b>Results:</b><br>
 * Each result includes:
 * <ul>
 * <li>Matching content chunk</li>
 * <li>Relevance score (0-1, higher is better)</li>
 * <li>Source document metadata (name, URL, type)</li>
 * </ul>
 * <b>Search History:</b><br>
 * All searches are saved and can be retrieved via <code>GET /search</code>.
 */
export declare function semanticSearchSearch(client$: PipeshubCore, request: SemanticSearchRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=semanticSearchSearch.d.ts.map