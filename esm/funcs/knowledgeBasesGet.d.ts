import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetKnowledgeBaseRequest } from "../models/getknowledgebaseop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get knowledge base by ID
 *
 * @remarks
 * Retrieve detailed information about a specific knowledge base.<br><br>
 * <b>Overview:</b><br>
 * Returns complete KB metadata including name, timestamps, and the requesting user's role/permissions.<br><br>
 * <b>Access Control:</b><br>
 * User must have at least READER permission to view KB details.
 */
export declare function knowledgeBasesGet(client$: PipeshubCore, request: GetKnowledgeBaseRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesGet.d.ts.map