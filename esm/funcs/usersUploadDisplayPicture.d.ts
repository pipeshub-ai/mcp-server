import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadUserDisplayPictureRequest } from "../models/uploaduserdisplaypictureop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload display picture
 *
 * @remarks
 * Upload or update the display picture (avatar) for the authenticated user.<br><br>
 * <b>Overview:</b><br>
 * This endpoint allows users to upload their profile picture. The image is processed, resized, and stored for use throughout the application.<br><br>
 * <b>File Requirements:</b><br>
 * <ul>
 * <li><b>Allowed types:</b> PNG, JPEG, JPG, WebP, GIF</li>
 * <li><b>Maximum size:</b> 1MB (1,048,576 bytes)</li>
 * <li><b>Recommended dimensions:</b> 256x256 pixels or larger</li>
 * <li><b>Aspect ratio:</b> Square recommended (will be cropped to square)</li>
 * </ul>
 * <b>Image Processing:</b><br>
 * <ul>
 * <li>Images are automatically resized to standard dimensions</li>
 * <li>Converted to JPEG for consistency and smaller file size</li>
 * <li>Multiple sizes may be generated (thumbnail, standard, large)</li>
 * <li>Original is not preserved</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Previous display picture is replaced</li>
 * <li>Cached images are invalidated</li>
 * <li>CDN cache may take time to update</li>
 * </ul>
 * <b>Authorization:</b><br>
 * Users can only upload their own display picture. Admins cannot upload on behalf of other users.
 */
export declare function usersUploadDisplayPicture(client$: PipeshubCore, request: UploadUserDisplayPictureRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersUploadDisplayPicture.d.ts.map