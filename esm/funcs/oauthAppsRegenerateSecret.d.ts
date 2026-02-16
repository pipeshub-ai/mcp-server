import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { RegenerateOAuthAppSecretRequest } from "../models/regenerateoauthappsecretop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Regenerate client secret
 *
 * @remarks
 * Regenerate the client secret for an OAuth app.
 * <br><br>
 * The old secret is immediately invalidated. Any clients using the old
 * secret will fail to authenticate until updated with the new secret.
 * <br><br>
 * <b>Important:</b> The new secret is only returned once. Store it securely.
 * <br><br>
 * <b>Admin Only:</b> Requires admin privileges.
 * <br><br>
 * <b>Rate Limited:</b> 10 requests per minute.
 */
export declare function oauthAppsRegenerateSecret(client$: PipeshubCore, request: RegenerateOAuthAppSecretRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthAppsRegenerateSecret.d.ts.map