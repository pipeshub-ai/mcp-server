import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CheckPasswordStatusSecurity } from "../models/checkpasswordstatusop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Check if user has password set (Internal)
 *
 * @remarks
 * Internal endpoint to check if a user has a password configured.
 * Used by other services to determine authentication capabilities.
 * <br><br>
 * <b>Note:</b> This is an internal service-to-service endpoint.
 */
export declare function userAccountCheckPasswordStatus(client$: PipeshubCore, security: CheckPasswordStatusSecurity, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountCheckPasswordStatus.d.ts.map