import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetConnectorFiltersRequest } from "../models/getconnectorfiltersop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get filter options
 *
 * @remarks
 * Get available filter options for a connector.<br><br>
 * <b>Overview:</b><br>
 * Returns filter fields that can be used to limit what data is synced.
 * For example, a Google Drive connector might offer filters for
 * specific folders or file types.<br><br>
 * <b>Dynamic Filters:</b><br>
 * Some filter fields have <code>dynamic: true</code>, meaning their
 * options are loaded separately via the filter options endpoint.
 */
export declare function connectorFiltersGet(client$: PipeshubCore, request: GetConnectorFiltersRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorFiltersGet.d.ts.map