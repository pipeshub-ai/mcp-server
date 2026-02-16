import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectorGetStatsRequest, ConnectorGetStatsSecurity } from "../models/connectorgetstatsop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Connector Service] Get connector statistics
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Get statistics for a specific connector.<br><br>
 *
 * <b>Service:</b> Connector Service<br>
 * <b>Port:</b> 8088<br>
 * <b>Base URL:</b> <code>http://localhost:8088</code><br><br>
 *
 * <b>Authentication:</b> Requires scoped service token
 */
export declare function connectorServiceConnectorGetStats(client$: PipeshubCore, security: ConnectorGetStatsSecurity, request: ConnectorGetStatsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorServiceConnectorGetStats.d.ts.map