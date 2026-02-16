import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OAuthIntrospectRequest } from "../models/oauthintrospectrequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Introspect a token
 *
 * @remarks
 * OAuth 2.0 Token Introspection Endpoint (RFC 7662).
 * <br><br>
 * Check if a token is active and retrieve its metadata.
 * <br><br>
 * <b>Use Cases:</b><br>
 * - Resource servers validating tokens<br>
 * - Debugging token issues<br>
 * - Checking token scopes before processing requests
 * <br><br>
 * <b>Response:</b><br>
 * - Active token: Returns `active: true` with token metadata<br>
 * - Invalid/expired/revoked token: Returns only `active: false`
 */
export declare function oAuthProviderOauthIntrospect(client$: PipeshubCore, request: OAuthIntrospectRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oAuthProviderOauthIntrospect.d.ts.map