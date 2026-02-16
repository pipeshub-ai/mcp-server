import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetKnowledgeHubChildNodesRequest } from "../models/getknowledgehubchildnodesop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get knowledge hub child nodes
 *
 * @remarks
 * Retrieve child nodes under a specific parent in the knowledge hub tree.<br><br>
 * <b>Navigation:</b><br>
 * Use this to drill down into KBs, folders, and connector hierarchies.
 */
export declare function knowledgeBasesGetChildNodes(client$: PipeshubCore, request: GetKnowledgeHubChildNodesRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesGetChildNodes.d.ts.map