import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OAuthTokenRequest } from "../models/oauthtokenrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Exchange authorization code for tokens
 *
 * @remarks
 * OAuth 2.0 Token Endpoint (RFC 6749 Section 4.1.3).
 * <br><br>
 * Exchanges an authorization code, client credentials, or refresh token for access tokens.
 * <br><br>
 * <b>Grant Types:</b><br>
 * - `authorization_code`: Exchange auth code for tokens (user-based)<br>
 * - `client_credentials`: Get tokens for machine-to-machine auth<br>
 * - `refresh_token`: Get new access token using refresh token
 * <br><br>
 * <b>Client Authentication:</b><br>
 * Can be provided via:<br>
 * - HTTP Basic auth: `Authorization: Basic base64(client_id:client_secret)`<br>
 * - Request body: `client_id` and `client_secret` parameters
 * <br><br>
 * <b>PKCE Verification:</b><br>
 * If authorization used PKCE, the `code_verifier` must be provided and will be
 * verified against the stored code challenge.
 */
export declare function oauthProviderExchangeToken(client$: PipeshubCore, request: OAuthTokenRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthProviderExchangeToken.d.ts.map