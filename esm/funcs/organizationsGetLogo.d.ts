import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get organization logo
 *
 * @remarks
 * Retrieve the organization's logo image or URL.<br><br>
 * <b>Response Formats:</b><br>
 * <ul>
 * <li>Returns a signed URL to access the logo</li>
 * <li>URL is valid for a limited time (typically 1 hour)</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Displaying logo in navigation/header</li>
 * <li>Email templates</li>
 * <li>White-label branding</li>
 * </ul>
 */
export declare function organizationsGetLogo(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsGetLogo.d.ts.map