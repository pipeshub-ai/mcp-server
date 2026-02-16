import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateConnectorFiltersSyncConfigRequest } from "../models/updateconnectorfilterssyncconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update filters and sync configuration
 *
 * @remarks
 * Update filter selections and sync settings without touching auth.<br><br>
 * <b>Use Case:</b><br>
 * Use this to change what data is synced or adjust sync schedule
 * without re-authenticating.
 */
export declare function connectorConfigurationUpdateFiltersSync(client$: PipeshubCore, request: UpdateConnectorFiltersSyncConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorConfigurationUpdateFiltersSync.d.ts.map