import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateKBPermissionRequest } from "../models/createkbpermissionop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Grant permissions
 *
 * @remarks
 * Grant access permissions to users or teams for a knowledge base.<br><br>
 * <b>Required Permission:</b> OWNER or ORGANIZER<br><br>
 * <b>Permission Roles (highest to lowest):</b><br>
 * <ol>
 * <li><b>OWNER:</b> Full control, can delete KB, manage all permissions</li>
 * <li><b>ORGANIZER:</b> Can manage permissions (except OWNER), edit KB settings</li>
 * <li><b>FILEORGANIZER:</b> Can create/delete folders, organize content</li>
 * <li><b>WRITER:</b> Can upload, edit, delete records</li>
 * <li><b>COMMENTER:</b> Can add comments (if supported)</li>
 * <li><b>READER:</b> View-only access</li>
 * </ol>
 * <b>Grant to Multiple:</b><br>
 * Provide arrays of userIds and/or teamIds to grant the same role to multiple entities.
 */
export declare function permissionsGrant(client$: PipeshubCore, request: CreateKBPermissionRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=permissionsGrant.d.ts.map