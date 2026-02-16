import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateGoogleWorkspaceCredentialsRequest } from "../models/creategoogleworkspacecredentialsop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Upload Google Workspace credentials
 *
 * @remarks
 * Upload Google Workspace credentials (service account JSON for business, or OAuth tokens for individual users). File must be valid JSON.
 */
export declare function connectorOAuthConfigurationCreateGoogleWorkspaceCredentials(client$: PipeshubCore, request: CreateGoogleWorkspaceCredentialsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthConfigurationCreateGoogleWorkspaceCredentials.d.ts.map