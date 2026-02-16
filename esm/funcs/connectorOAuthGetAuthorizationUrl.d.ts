import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetOAuthAuthorizationUrlRequest } from "../models/getoauthauthorizationurlop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get OAuth authorization URL
 *
 * @remarks
 * Generate an OAuth authorization URL to start the OAuth flow.<br><br>
 * <b>Flow:</b><br>
 * <ol>
 * <li>Call this endpoint to get the authorization URL</li>
 * <li>Redirect user's browser to the URL</li>
 * <li>User authenticates with the provider</li>
 * <li>Provider redirects to callback with authorization code</li>
 * <li>Callback exchanges code for tokens automatically</li>
 * </ol>
 * <b>State Parameter:</b><br>
 * The response includes a <code>state</code> value that encodes the
 * connector ID. This is validated in the callback.
 */
export declare function connectorOAuthGetAuthorizationUrl(client$: PipeshubCore, request: GetOAuthAuthorizationUrlRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthGetAuthorizationUrl.d.ts.map