import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateConnectorRequest } from "../models/createconnectorrequest.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create connector instance
 *
 * @remarks
 * Create a new connector instance from a registry type.<br><br>
 * <b>Overview:</b><br>
 * Creates a new connector instance that can then be configured and enabled.
 * The instance is created in an unconfigured state and needs authentication
 * and filter setup before it can be activated.<br><br>
 * <b>Scope Permissions:</b><br>
 * <ul>
 * <li><code>team</code> scope requires admin privileges</li>
 * <li><code>personal</code> scope available to all users</li>
 * </ul>
 * <b>Next Steps After Creation:</b><br>
 * <ol>
 * <li>Configure authentication via <code>PUT /{id}/config/auth</code></li>
 * <li>Complete OAuth flow if needed via <code>GET /{id}/oauth/authorize</code></li>
 * <li>Set up filters via <code>POST /{id}/filters</code></li>
 * <li>Enable connector via <code>POST /{id}/toggle</code></li>
 * </ol>
 */
export declare function connectorInstancesCreate(client$: PipeshubCore, request: CreateConnectorRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesCreate.d.ts.map