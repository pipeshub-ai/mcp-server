import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetConnectorConfigRequest } from "../models/getconnectorconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get connector configuration
 *
 * @remarks
 * Get the current configuration for a connector instance.<br><br>
 * <b>Security:</b><br>
 * Sensitive data (credentials, OAuth tokens) are redacted from the response.
 * Only admins can see partial credential information.
 */
export declare function connectorConfigurationGet(client$: PipeshubCore, request: GetConnectorConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorConfigurationGet.d.ts.map