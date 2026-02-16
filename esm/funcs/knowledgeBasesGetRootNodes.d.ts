import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetKnowledgeHubRootNodesRequest } from "../models/getknowledgehubrootnodesop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get knowledge hub root nodes
 *
 * @remarks
 * Retrieve root-level nodes for unified knowledge hub browsing.<br><br>
 * <b>Overview:</b><br>
 * Provides a unified view across all knowledge sources - KBs, connectors, and apps. Use for building file browser UIs.<br><br>
 * <b>Node Types:</b><br>
 * <ul>
 * <li><b>KB:</b> Knowledge bases</li>
 * <li><b>CONNECTOR:</b> External connector instances</li>
 * <li><b>APP:</b> Connected applications</li>
 * </ul>
 */
export declare function knowledgeBasesGetRootNodes(client$: PipeshubCore, request?: GetKnowledgeHubRootNodesRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesGetRootNodes.d.ts.map