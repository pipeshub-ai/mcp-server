import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OAuthConsentRequest } from "../models/oauthconsentrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Submit authorization consent
 *
 * @remarks
 * Submit user's consent decision for OAuth authorization.
 * <br><br>
 * Called after user reviews the consent page and makes a decision.
 * This endpoint generates an authorization code if consent is granted.
 * <br><br>
 * <b>Responses:</b><br>
 * - Consent granted: Redirects to client with authorization code<br>
 * - Consent denied: Redirects to client with `access_denied` error
 */
export declare function oAuthProviderOauthAuthorizeConsent(client$: PipeshubCore, request: OAuthConsentRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthProviderOauthAuthorizeConsent.d.ts.map