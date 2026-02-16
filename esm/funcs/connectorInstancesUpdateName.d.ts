import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateConnectorNameRequestRequest } from "../models/updateconnectornameop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update connector instance name
 *
 * @remarks
 * Update the display name of a connector instance.<br><br>
 * <b>Note:</b> This only updates the display name, not the connector configuration.
 */
export declare function connectorInstancesUpdateName(client$: PipeshubCore, request: UpdateConnectorNameRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesUpdateName.d.ts.map