import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateSamlAppConfigSecurity } from "../models/updatesamlappconfigop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reload SAML application configuration (Internal)
 *
 * @remarks
 * Internal endpoint to reload SAML configuration from the configuration manager.
 * This is called by other services when SAML settings are updated.<br><br>
 * <b>Purpose:</b><br>
 * When SAML configuration is updated in the Configuration Manager, this endpoint
 * is called to reload the settings into the authentication service without restart.<br><br>
 * <b>Effects:</b><br>
 * <ul>
 * <li>Reloads AppConfig from configuration files</li>
 * <li>Rebinds authentication controllers with new config</li>
 * <li>Updates SAML passport strategy settings</li>
 * </ul>
 * <b>Note:</b> This is an internal service-to-service endpoint.
 */
export declare function samlUpdateAppConfig(client$: PipeshubCore, security: UpdateSamlAppConfigSecurity, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=samlUpdateAppConfig.d.ts.map