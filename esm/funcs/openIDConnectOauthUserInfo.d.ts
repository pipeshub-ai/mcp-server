import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get authenticated user information
 *
 * @remarks
 * OpenID Connect UserInfo Endpoint.
 * <br><br>
 * Returns claims about the authenticated user. Requires a valid access token
 * with the `openid` scope.
 * <br><br>
 * <b>Available Claims:</b><br>
 * - `sub` - Subject identifier (user ID)<br>
 * - `name`, `given_name`, `family_name` - Name claims (with `profile` scope)<br>
 * - `email`, `email_verified` - Email claims (with `email` scope)
 * <br><br>
 * <b>Authentication:</b><br>
 * Pass the access token as a Bearer token: `Authorization: Bearer {access_token}`
 */
export declare function openIDConnectOauthUserInfo(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=openIDConnectOauthUserInfo.d.ts.map