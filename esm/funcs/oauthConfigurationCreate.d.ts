import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateOAuthConfigRequestRequest } from "../models/createoauthconfigop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create OAuth configuration
 *
 * @remarks
 * Create a new OAuth configuration for a connector type.<br><br>
 * <b>Admin Only:</b><br>
 * Only admins can create OAuth configurations. These provide the
 * OAuth credentials needed for users to authenticate connectors.<br><br>
 * <b>Use Case:</b><br>
 * Before users can create Google Drive connectors with OAuth,
 * an admin must create an OAuth configuration with the Google
 * OAuth client ID and secret.
 */
export declare function oauthConfigurationCreate(client$: PipeshubCore, request: CreateOAuthConfigRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthConfigurationCreate.d.ts.map