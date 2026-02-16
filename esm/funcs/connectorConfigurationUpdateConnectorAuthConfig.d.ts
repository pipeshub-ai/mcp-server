import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateConnectorAuthConfigRequest } from "../models/updateconnectorauthconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update authentication configuration
 *
 * @remarks
 * Update only the authentication configuration.<br><br>
 * <b>Use Case:</b><br>
 * Use this when you need to update credentials without changing
 * sync or filter settings. Useful for credential rotation.<br><br>
 * <b>Prerequisites:</b><br>
 * Connector must be disabled. This endpoint clears OAuth state,
 * requiring re-authentication for OAuth connectors.
 */
export declare function connectorConfigurationUpdateConnectorAuthConfig(client$: PipeshubCore, request: UpdateConnectorAuthConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorConfigurationUpdateConnectorAuthConfig.d.ts.map