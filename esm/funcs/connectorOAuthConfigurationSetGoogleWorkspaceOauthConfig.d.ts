import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GoogleWorkspaceOAuthConfig } from "../models/googleworkspaceoauthconfig.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure Google Workspace OAuth
 *
 * @remarks
 * Set up OAuth credentials for Google Workspace connector. Required for user authentication with Google Drive, Gmail, etc.
 */
export declare function connectorOAuthConfigurationSetGoogleWorkspaceOauthConfig(client$: PipeshubCore, request: GoogleWorkspaceOAuthConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthConfigurationSetGoogleWorkspaceOauthConfig.d.ts.map