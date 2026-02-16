import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListConnectorInstancesRequest } from "../models/listconnectorinstancesop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List connector instances
 *
 * @remarks
 * Get all configured connector instances for your organization.<br><br>
 * <b>Overview:</b><br>
 * Returns instances created by users, filtered by scope and permissions.
 * Team-scope connectors are visible to all org users. Personal connectors
 * are only visible to their creators.<br><br>
 * <b>Instance States:</b><br>
 * <ul>
 * <li><b>isConfigured:</b> All required settings are complete</li>
 * <li><b>isAuthenticated:</b> OAuth flow complete or credentials valid</li>
 * <li><b>isActive:</b> Connector is enabled for sync/agent</li>
 * </ul>
 */
export declare function connectorInstancesList(client$: PipeshubCore, request?: ListConnectorInstancesRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesList.d.ts.map