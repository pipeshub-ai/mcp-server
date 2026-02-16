import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ToggleConnectorRequest } from "../models/toggleconnectorop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Toggle connector sync or agent
 *
 * @remarks
 * Enable or disable a connector for sync or agent functionality.<br><br>
 * <b>Toggle Types:</b><br>
 * <ul>
 * <li><code>sync</code> - Enable/disable data synchronization</li>
 * <li><code>agent</code> - Enable/disable AI agent integration</li>
 * </ul>
 * <b>Prerequisites for Enabling:</b><br>
 * <ul>
 * <li>Connector must be configured (<code>isConfigured: true</code>)</li>
 * <li>For OAuth connectors: Must be authenticated (<code>isAuthenticated: true</code>)</li>
 * <li>For agent: Connector must support agent (<code>supportsAgent: true</code>)</li>
 * </ul>
 * <b>Permissions:</b><br>
 * <ul>
 * <li>Team scope: Requires admin</li>
 * <li>Personal scope: Only creator can toggle</li>
 * </ul>
 */
export declare function connectorControlToggle(client$: PipeshubCore, request: ToggleConnectorRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorControlToggle.d.ts.map