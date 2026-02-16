import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetTokenFromCodeRequest } from "../models/gettokenfromcodeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Exchange authorization code for tokens (legacy)
 *
 * @remarks
 * Exchange a Google Workspace authorization code for access and refresh tokens.<br><br>
 * <b>Note:</b> This is a legacy endpoint specific to Google Workspace connectors.
 * For new integrations, use the standard OAuth flow via
 * <code>/connectors/{connectorId}/oauth/authorize</code> and the callback.<br><br>
 * <b>Flow:</b><br>
 * <ol>
 * <li>User completes Google Workspace OAuth consent in the browser</li>
 * <li>Browser receives authorization code</li>
 * <li>Frontend sends the code to this endpoint</li>
 * <li>Backend exchanges code for tokens and stores them</li>
 * </ol>
 * <b>Admin Only:</b> Requires admin privileges.
 */
export declare function connectorOAuthGetTokenFromCode(client$: PipeshubCore, request: GetTokenFromCodeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthGetTokenFromCode.d.ts.map