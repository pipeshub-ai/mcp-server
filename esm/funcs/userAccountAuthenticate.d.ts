import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AuthenticateRequestRequest } from "../models/authenticateop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Authenticate user with credentials
 *
 * @remarks
 * Authenticate a user using the specified method and credentials.
 * Requires a valid session token from <code>/initAuth</code>.
 * <br><br>
 * <b>Credential Formats by Method:</b><br>
 * - <code>password</code>: <code>{ "credentials": { "password": "your-password" } }</code><br>
 * - <code>otp</code>: <code>{ "credentials": { "otp": "123456" } }</code> (6-digit code, valid for 10 minutes)<br>
 * - <code>google</code>: <code>{ "credentials": "google-id-token-string" }</code><br>
 * - <code>microsoft</code>: <code>{ "credentials": { "accessToken": "...", "idToken": "..." } }</code><br>
 * - <code>azureAd</code>: <code>{ "credentials": { "accessToken": "...", "idToken": "..." } }</code><br>
 * - <code>oauth</code>: <code>{ "credentials": { "accessToken": "...", "idToken": "..." } }</code><br>
 * - <code>samlSso</code>: Handled via redirect flow (use <code>/saml/signIn</code> instead)
 * <br><br>
 * <b>Multi-Step Response:</b><br>
 * If organization uses MFA, successful authentication returns:<br>
 * - <code>status: "success"</code> with <code>nextStep</code> and <code>allowedMethods</code> for next step
 * <br><br>
 * <b>Fully Authenticated Response:</b><br>
 * After completing all steps:<br>
 * - <code>message: "Fully authenticated"</code> with <code>accessToken</code> (1hr) and <code>refreshToken</code> (7d)
 * <br><br>
 * <b>Security:</b><br>
 * - Account locks after 5 consecutive failed attempts<br>
 * - CAPTCHA may be required if enabled (pass <code>cf-turnstile-response</code>)
 */
export declare function userAccountAuthenticate(client$: PipeshubCore, request: AuthenticateRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountAuthenticate.d.ts.map