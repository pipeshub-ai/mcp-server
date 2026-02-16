import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteKnowledgeBaseRequest } from "../models/deleteknowledgebaseop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete knowledge base
 *
 * @remarks
 * Permanently delete a knowledge base and all its contents.<br><br>
 * <b>Required Permission:</b> OWNER only<br><br>
 * <b>What Gets Deleted:</b><br>
 * <ul>
 * <li>All folders within the KB</li>
 * <li>All records and their indexed content</li>
 * <li>All permission grants</li>
 * <li>Associated storage files</li>
 * </ul>
 * <b>Warning:</b> This action is irreversible. Consider exporting data before deletion.
 */
export declare function knowledgeBasesDelete(client$: PipeshubCore, request: DeleteKnowledgeBaseRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesDelete.d.ts.map