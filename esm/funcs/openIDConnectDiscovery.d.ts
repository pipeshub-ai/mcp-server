import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * OpenID Connect Discovery
 *
 * @remarks
 * OpenID Connect Discovery Endpoint (RFC 8414).
 * <br><br>
 * Returns metadata about the OAuth/OIDC authorization server including
 * endpoint URLs, supported features, and capabilities.
 * <br><br>
 * <b>Use Cases:</b><br>
 * - Automatic client configuration<br>
 * - Discovering supported features<br>
 * - Getting endpoint URLs without hardcoding
 * <br><br>
 * <b>Note:</b> This endpoint does not require authentication.
 */
export declare function openIDConnectDiscovery(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=openIDConnectDiscovery.d.ts.map