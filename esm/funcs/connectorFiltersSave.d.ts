import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SaveConnectorFiltersRequestRequest } from "../models/saveconnectorfiltersop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Save filter selections
 *
 * @remarks
 * Save the user's filter selections for a connector.<br><br>
 * <b>Overview:</b><br>
 * After viewing filter options, use this endpoint to save the
 * selected values. These determine what data will be synced.
 */
export declare function connectorFiltersSave(client$: PipeshubCore, request: SaveConnectorFiltersRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorFiltersSave.d.ts.map