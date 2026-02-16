import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteConnectorInstanceRequest } from "../models/deleteconnectorinstanceop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete connector instance
 *
 * @remarks
 * Delete a connector instance and all associated data.<br><br>
 * <b>Warning:</b><br>
 * This permanently removes the connector configuration.
 * Synced records in knowledge bases are NOT deleted.<br><br>
 * <b>Permissions:</b><br>
 * <ul>
 * <li>Team scope: Requires admin</li>
 * <li>Personal scope: Only creator can delete</li>
 * </ul>
 */
export declare function connectorInstancesDelete(client$: PipeshubCore, request: DeleteConnectorInstanceRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesDelete.d.ts.map