import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AzureAdAuthConfig } from "../models/azureadauthconfig.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure Azure AD authentication
 *
 * @remarks
 * Set up Azure Active Directory as an authentication provider for user login.
 */
export declare function authenticationConfigurationSetAzureAdAuthConfig(client$: PipeshubCore, request: AzureAdAuthConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=authenticationConfigurationSetAzureAdAuthConfig.d.ts.map