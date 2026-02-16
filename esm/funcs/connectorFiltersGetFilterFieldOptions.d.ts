import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetFilterFieldOptionsRequest } from "../models/getfilterfieldoptionsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get dynamic filter options
 *
 * @remarks
 * Get options for a dynamic filter field with pagination.<br><br>
 * <b>Overview:</b><br>
 * For filters with <code>dynamic: true</code>, options are loaded
 * from the connected service. This supports pagination and search.<br><br>
 * <b>Examples:</b><br>
 * <ul>
 * <li>Google Drive folders list</li>
 * <li>Slack channels list</li>
 * <li>Confluence spaces list</li>
 * </ul>
 */
export declare function connectorFiltersGetFilterFieldOptions(client$: PipeshubCore, request: GetFilterFieldOptionsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorFiltersGetFilterFieldOptions.d.ts.map