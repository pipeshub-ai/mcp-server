import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SignInViaSAMLRequest } from "../models/signinviasamlop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Initiate SAML sign-in flow
 *
 * @remarks
 * Initiate SAML Single Sign-On authentication by redirecting to the Identity Provider (IDP).
 * <br><br>
 * <b>Usage:</b><br>
 * 1. Call <code>/userAccount/initAuth</code> to get a session token<br>
 * 2. If <code>samlSso</code> is in the allowed methods, redirect the user to this endpoint<br>
 * 3. User authenticates with their IDP<br>
 * 4. IDP redirects back to <code>/saml/signIn/callback</code> with SAML response<br>
 * 5. Callback completes authentication and returns tokens
 * <br><br>
 * <b>Note:</b> This is a browser redirect endpoint, not a typical API call.
 * The user's browser should be redirected to this URL.
 * <br><br>
 * <b>Prerequisites:</b><br>
 * - Organization must have SAML SSO configured via <code>/saml/updateAppConfig</code><br>
 * - User must belong to an organization with SAML enabled
 */
export declare function samlSignInViaSAML(client$: PipeshubCore, request: SignInViaSAMLRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=samlSignInViaSAML.d.ts.map