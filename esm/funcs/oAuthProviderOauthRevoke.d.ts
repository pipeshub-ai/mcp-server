import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OAuthRevokeRequest } from "../models/oauthrevokerequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Revoke an access or refresh token
 *
 * @remarks
 * OAuth 2.0 Token Revocation Endpoint (RFC 7009).
 * <br><br>
 * Revokes an access token or refresh token, preventing further use.
 * Revoking a refresh token also invalidates associated access tokens.
 * <br><br>
 * <b>Use Cases:</b><br>
 * - User logs out of third-party app<br>
 * - User revokes app access from account settings<br>
 * - Security incident response
 * <br><br>
 * <b>Note:</b> Returns 200 OK even if token was already revoked or invalid
 * (per RFC 7009, to prevent token enumeration).
 */
export declare function oAuthProviderOauthRevoke(client$: PipeshubCore, request: OAuthRevokeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthProviderOauthRevoke.d.ts.map