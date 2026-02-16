import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { AtlassianConfig } from "../models/atlassianconfig.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure Atlassian OAuth
 *
 * @remarks
 * Set up OAuth credentials for Atlassian (Confluence/Jira) connector.
 */
export declare function connectorOAuthConfigurationSetAtlassianConfig(client$: PipeshubCore, request: AtlassianConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthConfigurationSetAtlassianConfig.d.ts.map