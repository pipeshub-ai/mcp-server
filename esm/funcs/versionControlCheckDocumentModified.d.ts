import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckDocumentModifiedRequest } from "../models/checkdocumentmodifiedop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check if document is modified
 *
 * @remarks
 * Check if the current document content differs from the last saved version. Useful for detecting unsaved changes.<br><br>
 * <b>Overview:</b><br>
 * Compares the current document buffer with the most recent version in history to detect modifications. Returns true if content has changed since last version.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Prompting user to save before closing</li>
 * <li>Auto-save decision making</li>
 * <li>Version creation validation</li>
 * <li>Change detection in workflows</li>
 * </ul>
 * <b>Comparison Method:</b><br>
 * Performs binary comparison of file buffers. Identical content returns false even if edited and reverted.<br><br>
 * <b>Requirements:</b><br>
 * Document must be versioned to have comparison baseline.
 */
export declare function versionControlCheckDocumentModified(client$: PipeshubCore, request: CheckDocumentModifiedRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=versionControlCheckDocumentModified.d.ts.map