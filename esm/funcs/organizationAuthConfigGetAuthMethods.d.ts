import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get organization authentication methods
 *
 * @remarks
 * Retrieve the configured authentication methods for the organization.
 * <br><br>
 * <b>Response Structure:</b><br>
 * Returns an array of authentication steps, each containing:<br>
 * - <code>order</code>: Step number (1-3)<br>
 * - <code>allowedMethods</code>: Array of methods allowed for that step
 * <br><br>
 * <b>Example Response:</b><br>
 * <pre>
 * {
 *   "authMethods": [
 *     { "order": 1, "allowedMethods": [{ "type": "password" }, { "type": "google" }] },
 *     { "order": 2, "allowedMethods": [{ "type": "otp" }] }
 *   ]
 * }
 * </pre>
 * <br>
 * <b>Admin Access Required:</b> Only organization admins can view auth configuration.
 */
export declare function organizationAuthConfigGetAuthMethods(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationAuthConfigGetAuthMethods.d.ts.map