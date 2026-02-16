import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListUsersGraphRequest } from "../models/listusersgraphop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List users (paginated with graph data)
 *
 * @remarks
 * Retrieve a paginated list of users with enhanced search capabilities using the graph service.<br><br>
 * <b>Overview:</b><br>
 * This endpoint provides advanced user listing with full-text search, pagination, and optional relationship data from the knowledge graph. It's optimized for large organizations with thousands of users.<br><br>
 * <b>Search Capabilities:</b><br>
 * <ul>
 * <li>Full-text search across name and email</li>
 * <li>Fuzzy matching for typo tolerance</li>
 * <li>Results ranked by relevance</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>User directory with search</li>
 * <li>Autocomplete user selection</li>
 * <li>Admin user management lists</li>
 * <li>User analytics dashboards</li>
 * </ul>
 * <b>Performance:</b><br>
 * <ul>
 * <li>Powered by graph database for fast queries</li>
 * <li>Supports pagination for large datasets</li>
 * <li>Results cached for repeated queries</li>
 * </ul>
 * <b>vs /users endpoint:</b><br>
 * Use this endpoint when you need advanced search or are dealing with large user bases. Use <code>/users</code> for simple full-list retrieval.
 */
export declare function usersListUsersGraph(client$: PipeshubCore, request?: ListUsersGraphRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersListUsersGraph.d.ts.map