import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
export declare enum GetDisplayPictureAcceptEnum {
    imageJpegAccept = "image/jpeg",
    imagePngAccept = "image/png"
}
/**
 * Get display picture
 *
 * @remarks
 * Retrieve the current user's display picture image.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns the user's profile picture as binary image data. Use this for displaying the user's avatar in the application.<br><br>
 * <b>Response Format:</b><br>
 * <ul>
 * <li>Returns raw image data (not JSON)</li>
 * <li>Content-Type header indicates image format (typically image/jpeg)</li>
 * <li>Suitable for use directly in &lt;img&gt; src or CSS background</li>
 * </ul>
 * <b>Caching:</b><br>
 * <ul>
 * <li>Response includes cache headers for browser caching</li>
 * <li>Use ETag for conditional requests</li>
 * <li>Cache invalidated when picture is updated</li>
 * </ul>
 * <b>Alternative:</b><br>
 * For signed URL access, use the user profile endpoint which returns a <code>displayPictureUrl</code> field.
 */
export declare function usersGetDisplayPicture(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersGetDisplayPicture.d.ts.map