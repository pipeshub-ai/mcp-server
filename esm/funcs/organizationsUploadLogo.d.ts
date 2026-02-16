import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UploadOrganizationLogoRequest } from "../models/uploadorganizationlogoop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload organization logo
 *
 * @remarks
 * Upload or update the organization's logo image.<br><br>
 * <b>Supported Formats:</b><br>
 * <ul>
 * <li>PNG (recommended for transparency)</li>
 * <li>JPG/JPEG</li>
 * <li>SVG</li>
 * <li>WebP</li>
 * </ul>
 * <b>Requirements:</b><br>
 * <ul>
 * <li>Maximum file size: 5MB</li>
 * <li>Recommended dimensions: 256x256 pixels or higher</li>
 * <li>Square aspect ratio recommended</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Previous logo is replaced</li>
 * <li>Multiple sizes may be generated for different use cases</li>
 * </ul>
 */
export declare function organizationsUploadLogo(client$: PipeshubCore, request: UploadOrganizationLogoRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsUploadLogo.d.ts.map