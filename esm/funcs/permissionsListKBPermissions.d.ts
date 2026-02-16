import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListKBPermissionsRequest } from "../models/listkbpermissionsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List permissions
 *
 * @remarks
 * Retrieve all permissions granted on a knowledge base.<br><br>
 * <b>Required Permission:</b> ORGANIZER or higher to see all permissions, others see only their own.
 */
export declare function permissionsListKBPermissions(client$: PipeshubCore, request: ListKBPermissionsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=permissionsListKBPermissions.d.ts.map