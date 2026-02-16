import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove display picture
 *
 * @remarks
 * Remove the current user's display picture and revert to default avatar.<br><br>
 * <b>Overview:</b><br>
 * This endpoint permanently removes the user's uploaded profile picture. After removal, the user will display a default avatar (typically initials or generic icon).<br><br>
 * <b>What Happens:</b><br>
 * <ul>
 * <li>Profile picture file is deleted from storage</li>
 * <li>User profile updated to remove picture reference</li>
 * <li>Cached images invalidated</li>
 * <li>Default avatar will be shown in UI</li>
 * </ul>
 * <b>Note:</b><br>
 * This action is immediate and irreversible. To restore a picture, user must upload a new one.
 */
export declare function usersRemoveUserDisplayPicture(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersRemoveUserDisplayPicture.d.ts.map