import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateOAuthConfigRequest } from "../models/updateoauthconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update OAuth configuration
 *
 * @remarks
 * Update an OAuth configuration.<br><br>
 * <b>Admin Only:</b><br>
 * Only the creator or another admin can update.
 */
export declare function oauthConfigurationUpdate(client$: PipeshubCore, request: UpdateOAuthConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=oauthConfigurationUpdate.d.ts.map