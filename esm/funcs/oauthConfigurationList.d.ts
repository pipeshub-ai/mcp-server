import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListOAuthConfigsRequest } from "../models/listoauthconfigsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List OAuth configurations
 *
 * @remarks
 * List all OAuth configurations for the organization.<br><br>
 * <b>Security:</b><br>
 * <ul>
 * <li>Admins see full configuration including credentials</li>
 * <li>Non-admins see only essential fields (client ID, not secret)</li>
 * </ul>
 */
export declare function oauthConfigurationList(client$: PipeshubCore, request?: ListOAuthConfigsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthConfigurationList.d.ts.map