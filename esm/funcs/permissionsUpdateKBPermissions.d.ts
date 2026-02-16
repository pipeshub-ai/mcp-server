import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateKBPermissionsRequest } from "../models/updatekbpermissionsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update permissions
 *
 * @remarks
 * Update permission roles for users or teams.<br><br>
 * <b>Required Permission:</b> OWNER or ORGANIZER
 */
export declare function permissionsUpdateKBPermissions(client$: PipeshubCore, request: UpdateKBPermissionsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=permissionsUpdateKBPermissions.d.ts.map