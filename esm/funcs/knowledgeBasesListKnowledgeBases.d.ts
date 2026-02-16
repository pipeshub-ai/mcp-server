import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListKnowledgeBasesRequest } from "../models/listknowledgebasesop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List all knowledge bases
 *
 * @remarks
 * Retrieve a paginated list of all knowledge bases accessible to the authenticated user.<br><br>
 * <b>Overview:</b><br>
 * Returns knowledge bases where the user has at least READER permission. Results include the user's role for each KB.<br><br>
 * <b>Filtering:</b><br>
 * <ul>
 * <li><b>search:</b> Full-text search on KB names (max 1000 chars)</li>
 * <li><b>permissions:</b> Filter by user's role (comma-separated: OWNER,WRITER,READER)</li>
 * </ul>
 * <b>Sorting Options:</b><br>
 * <ul>
 * <li><code>name</code> - Alphabetical by KB name</li>
 * <li><code>createdAtTimestamp</code> - By creation date</li>
 * <li><code>updatedAtTimestamp</code> - By last modification</li>
 * <li><code>userRole</code> - By permission level</li>
 * </ul>
 * <b>Performance:</b><br>
 * Uses efficient pagination with limit/offset. For large result sets, use smaller page sizes.
 */
export declare function knowledgeBasesListKnowledgeBases(client$: PipeshubCore, request?: ListKnowledgeBasesRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesListKnowledgeBases.d.ts.map