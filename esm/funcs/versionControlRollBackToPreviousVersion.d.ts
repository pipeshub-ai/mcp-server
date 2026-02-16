import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RollBackToPreviousVersionRequest } from "../models/rollbacktopreviousversionop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Rollback to previous version
 *
 * @remarks
 * Restore a versioned document to a previous version. Creates a new version entry with the rolled-back content.<br><br>
 * <b>Overview:</b><br>
 * This endpoint allows reverting a document to any previous version while maintaining the complete version history. The rollback itself creates a new version entry.<br><br>
 * <b>Rollback Flow:</b><br>
 * <ol>
 * <li>Specify target version number to rollback to</li>
 * <li>System retrieves content from that version</li>
 * <li>Creates new version entry with restored content</li>
 * <li>Adds rollback note to version history</li>
 * <li>Document now shows restored content</li>
 * </ol>
 * <b>Version History Preserved:</b><br>
 * Rollback does NOT delete intermediate versions. Full history remains intact for audit purposes.<br><br>
 * <b>Requirements:</b><br>
 * <ul>
 * <li>Document must be versioned</li>
 * <li>Target version must exist (less than current version count)</li>
 * <li>Note explaining rollback reason is required</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Reverting accidental changes</li>
 * <li>Restoring to known-good state</li>
 * <li>Undoing problematic updates</li>
 * </ul>
 */
export declare function versionControlRollBackToPreviousVersion(client$: PipeshubCore, request: RollBackToPreviousVersionRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=versionControlRollBackToPreviousVersion.d.ts.map