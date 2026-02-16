import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadNextVersionRequest } from "../models/uploadnextversionop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload next version
 *
 * @remarks
 * Upload a new version of a versioned document, maintaining full version history.<br><br>
 * <b>Overview:</b><br>
 * This endpoint creates a new version entry in the document's version history. The previous version remains accessible and the document can be rolled back if needed.<br><br>
 * <b>Version Control Flow:</b><br>
 * <ol>
 * <li>Upload new file content</li>
 * <li>System compares with previous version</li>
 * <li>If different, creates new version entry</li>
 * <li>Updates version history with metadata</li>
 * <li>Current document points to new version</li>
 * </ol>
 * <b>Version Entry Contains:</b><br>
 * <ul>
 * <li>Version number (auto-incremented)</li>
 * <li>Storage URL for this version</li>
 * <li>Size and extension</li>
 * <li>Optional note describing changes</li>
 * <li>User who created version</li>
 * <li>Timestamp</li>
 * </ul>
 * <b>Requirements:</b><br>
 * <ul>
 * <li>Document must have <code>isVersionedFile: true</code></li>
 * <li>File extension must match original document</li>
 * <li>Content must differ from previous version</li>
 * </ul>
 * <b>File Constraints:</b><br>
 * <ul>
 * <li>Maximum size: 100MB</li>
 * <li>Same extension as original required</li>
 * </ul>
 */
export declare function versionControlUploadNextVersion(client$: PipeshubCore, request: UploadNextVersionRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=versionControlUploadNextVersion.d.ts.map