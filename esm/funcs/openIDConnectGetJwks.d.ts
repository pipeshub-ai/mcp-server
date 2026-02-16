import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * JSON Web Key Set
 *
 * @remarks
 * JSON Web Key Set Endpoint (RFC 7517).
 * <br><br>
 * Returns the public keys used to verify JWT signatures for ID tokens
 * and access tokens.
 * <br><br>
 * <b>Use Cases:</b><br>
 * - Verifying ID token signatures<br>
 * - Verifying access token signatures (if JWT-based)
 * <br><br>
 * <b>Note:</b><br>
 * - For HS256 (symmetric) signing, this returns empty keys<br>
 * - For RS256 (asymmetric) signing, returns public RSA keys<br>
 * - Keys should be cached with appropriate TTL
 */
export declare function openIDConnectGetJwks(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=openIDConnectGetJwks.d.ts.map