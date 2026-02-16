import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ListActiveAgentConnectorsRequest } from "../models/listactiveagentconnectorsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List active agent connectors
 *
 * @remarks
 * Get connector instances enabled for AI agent integration.<br><br>
 * <b>Overview:</b><br>
 * Returns connectors where <code>agentEnabled: true</code>.
 * These are available to AI agents for querying and actions.
 */
export declare function connectorInstancesListActiveAgentConnectors(client$: PipeshubCore, request?: ListActiveAgentConnectorsRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorInstancesListActiveAgentConnectors.d.ts.map