import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OauthAuthorizeRequest } from "../models/oauthauthorizeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Initiate OAuth authorization flow
 *
 * @remarks
 * OAuth 2.0 Authorization Endpoint (RFC 6749 Section 4.1.1).
 * <br><br>
 * Initiates the authorization code flow. Users are redirected here by OAuth clients
 * to authorize access to their account.
 * <br><br>
 * <b>Flow:</b><br>
 * 1. Client redirects user to this endpoint with required parameters<br>
 * 2. If not logged in, user is redirected to PipesHub login<br>
 * 3. User sees consent page with requested scopes<br>
 * 4. User grants or denies consent<br>
 * 5. User is redirected back to client with authorization code
 * <br><br>
 * <b>PKCE Support (RFC 7636):</b><br>
 * - Required for public clients (SPA, mobile apps)<br>
 * - Recommended for confidential clients<br>
 * - Use S256 method (SHA256 hash of code_verifier)
 * <br><br>
 * <b>Security:</b><br>
 * - Always use HTTPS in production<br>
 * - State parameter provides CSRF protection<br>
 * - Redirect URI must match registered URIs exactly
 */
export declare function oauthProviderAuthorize(client$: PipeshubCore, request: OauthAuthorizeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthProviderAuthorize.d.ts.map