import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { HandleOAuthCallbackRequest } from "../models/handleoauthcallbackop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * OAuth callback handler
 *
 * @remarks
 * Handle the OAuth callback from the identity provider.<br><br>
 * <b>Note:</b><br>
 * This endpoint is called by the OAuth provider after user authentication.
 * The state parameter contains the encoded connector ID.<br><br>
 * <b>Success:</b><br>
 * On success, tokens are stored and the connector becomes authenticated.
 * User is redirected to the frontend success page.<br><br>
 * <b>Error:</b><br>
 * If the provider returns an error (e.g., user denied access),
 * user is redirected with error information.
 */
export declare function connectorOAuthHandleCallback(client$: PipeshubCore, request?: HandleOAuthCallbackRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthHandleCallback.d.ts.map