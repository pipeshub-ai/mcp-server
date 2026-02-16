import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check if organization exists
 *
 * @remarks
 * Check if any organization has been created in the system. This is typically the first API call made during initial setup.<br><br>
 * <b>Overview:</b><br>
 * This public endpoint determines whether the system has been initialized with an organization. Used by the frontend to decide whether to show the setup wizard or the login screen.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>First-time setup detection</li>
 * <li>Onboarding flow decisions</li>
 * <li>System initialization checks</li>
 * </ul>
 * <b>Response:</b><br>
 * <ul>
 * <li><code>exists: true</code> - Organization exists, show login</li>
 * <li><code>exists: false</code> - No organization, show setup wizard</li>
 * </ul>
 * <b>Note:</b> This endpoint requires no authentication and is publicly accessible.
 */
export declare function organizationsCheckOrgExists(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsCheckOrgExists.d.ts.map