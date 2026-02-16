import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AuthConfig } from "../models/authconfig.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update organization authentication methods
 *
 * @remarks
 * Update the authentication methods configuration for an organization.
 * This allows admins to configure single or multi-factor authentication.
 * <br><br>
 * <b>Validation Rules:</b><br>
 * - Minimum 1 step, maximum 3 steps<br>
 * - Each step must have a unique order (1, 2, or 3)<br>
 * - No duplicate methods within the same step<br>
 * - No method can appear in multiple steps<br>
 * - Each step must have at least one allowed method
 * <br><br>
 * <b>Available Methods:</b><br>
 * - <code>password</code>: Email/password authentication<br>
 * - <code>otp</code>: One-time password via email<br>
 * - <code>google</code>: Google OAuth 2.0<br>
 * - <code>microsoft</code>: Microsoft OAuth 2.0<br>
 * - <code>azureAd</code>: Azure Active Directory<br>
 * - <code>samlSso</code>: SAML 2.0 Single Sign-On<br>
 * - <code>oauth</code>: Generic OAuth 2.0 provider
 * <br><br>
 * <b>Example - Single Factor (Password or Google):</b><br>
 * <pre>
 * {
 *   "authMethods": [
 *     { "order": 1, "allowedMethods": [{ "type": "password" }, { "type": "google" }] }
 *   ]
 * }
 * </pre>
 * <br>
 * <b>Example - Two Factor (Password + OTP):</b><br>
 * <pre>
 * {
 *   "authMethods": [
 *     { "order": 1, "allowedMethods": [{ "type": "password" }] },
 *     { "order": 2, "allowedMethods": [{ "type": "otp" }] }
 *   ]
 * }
 * </pre>
 * <br>
 * <b>Admin Access Required:</b> Only organization admins can update auth configuration.
 */
export declare function organizationAuthConfigUpdateAuthMethod(client$: PipeshubCore, request: AuthConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationAuthConfigUpdateAuthMethod.d.ts.map