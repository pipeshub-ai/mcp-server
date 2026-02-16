import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OAuthExchangeRequest } from "../models/oauthexchangerequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Exchange OAuth authorization code for tokens
 *
 * @remarks
 * Exchange an OAuth authorization code for access and ID tokens.
 * Used after the OAuth authorization flow redirects back to the application.
 * <br><br>
 * <b>Supported Providers:</b><br>
 * - Generic OAuth 2.0 providers configured in org settings
 * <br><br>
 * <b>Flow:</b><br>
 * 1. User is redirected to OAuth provider's authorization URL<br>
 * 2. User authorizes and is redirected back with a code<br>
 * 3. This endpoint exchanges the code for tokens<br>
 * 4. Tokens can then be used with the <code>/userAccount/authenticate</code> endpoint
 */
export declare function oauthExchangeCode(client$: PipeshubCore, request: OAuthExchangeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthExchangeCode.d.ts.map