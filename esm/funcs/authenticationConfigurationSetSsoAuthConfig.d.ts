import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SSOAuthConfig } from "../models/ssoauthconfig.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure SAML SSO authentication
 *
 * @remarks
 * Set up SAML 2.0 Single Sign-On with your identity provider (Okta, OneLogin, etc.).
 */
export declare function authenticationConfigurationSetSsoAuthConfig(client$: PipeshubCore, request: SSOAuthConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=authenticationConfigurationSetSsoAuthConfig.d.ts.map