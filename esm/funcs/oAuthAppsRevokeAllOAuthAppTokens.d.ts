import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RevokeAllOAuthAppTokensRequest } from "../models/revokealloauthapptokensop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Revoke all app tokens
 *
 * @remarks
 * Revoke all tokens (access and refresh) issued to an OAuth app.
 * <br><br>
 * Use this for emergency access removal or when rotating credentials.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oAuthAppsRevokeAllOAuthAppTokens(client$: PipeshubCore, request: RevokeAllOAuthAppTokensRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthAppsRevokeAllOAuthAppTokens.d.ts.map