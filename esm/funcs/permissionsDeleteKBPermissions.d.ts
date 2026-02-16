import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteKBPermissionsRequest } from "../models/deletekbpermissionsop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Remove permissions
 *
 * @remarks
 * Remove access permissions from users or teams.<br><br>
 * <b>Required Permission:</b> OWNER or ORGANIZER<br><br>
 * <b>Note:</b> Cannot remove the last OWNER from a KB.
 */
export declare function permissionsDeleteKBPermissions(client$: PipeshubCore, request: DeleteKBPermissionsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=permissionsDeleteKBPermissions.d.ts.map