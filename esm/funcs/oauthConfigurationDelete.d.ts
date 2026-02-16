import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteOAuthConfigRequest } from "../models/deleteoauthconfigop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete OAuth configuration
 *
 * @remarks
 * Delete an OAuth configuration.<br><br>
 * <b>Warning:</b><br>
 * Cannot delete if the configuration is used by active connectors.
 * Disable or delete dependent connectors first.
 */
export declare function oauthConfigurationDelete(client$: PipeshubCore, request: DeleteOAuthConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthConfigurationDelete.d.ts.map