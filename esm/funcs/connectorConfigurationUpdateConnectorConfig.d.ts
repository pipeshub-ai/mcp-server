import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateConnectorConfigRequestRequest } from "../models/updateconnectorconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update connector configuration
 *
 * @remarks
 * Update authentication, sync, and filter configuration.<br><br>
 * <b>Prerequisites:</b><br>
 * Connector must be <b>disabled</b> before updating configuration.
 * Disable it first using <code>POST /{id}/toggle</code>.<br><br>
 * <b>Partial Updates:</b><br>
 * Only provide the sections you want to update. Omitted sections
 * are not modified.
 */
export declare function connectorConfigurationUpdateConnectorConfig(client$: PipeshubCore, request: UpdateConnectorConfigRequestRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorConfigurationUpdateConnectorConfig.d.ts.map