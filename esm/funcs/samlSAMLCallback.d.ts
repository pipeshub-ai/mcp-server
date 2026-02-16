import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SamlCallbackRequest } from "../models/samlcallbackop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * SAML authentication callback
 *
 * @remarks
 * Handle the callback from SAML Identity Provider after user authentication.
 * This endpoint processes the SAML response and completes the authentication flow.
 * <br><br>
 * <b>Note:</b> This endpoint is called by the IDP, not directly by the client.
 * The IDP posts the SAML response to this URL after user authentication.
 * <br><br>
 * <b>Flow:</b><br>
 * 1. IDP posts SAMLResponse and RelayState<br>
 * 2. Server validates SAML assertion signature<br>
 * 3. Server extracts user identity from assertion<br>
 * 4. Server completes the authentication step<br>
 * 5. Redirects to frontend with success/error status
 * <br><br>
 * <b>RelayState:</b> Contains the session token to resume the authentication flow.
 */
export declare function samlSAMLCallback(client$: PipeshubCore, request?: SamlCallbackRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=samlSAMLCallback.d.ts.map