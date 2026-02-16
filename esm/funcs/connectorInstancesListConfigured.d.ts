import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListConfiguredConnectorsRequest } from "../models/listconfiguredconnectorsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List configured connector instances
 *
 * @remarks
 * Get all connector instances that have completed configuration.<br><br>
 * <b>Overview:</b><br>
 * Returns instances where <code>isConfigured: true</code>.
 * These have all required settings but may not be active yet.
 */
export declare function connectorInstancesListConfigured(client$: PipeshubCore, request?: ListConfiguredConnectorsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesListConfigured.d.ts.map