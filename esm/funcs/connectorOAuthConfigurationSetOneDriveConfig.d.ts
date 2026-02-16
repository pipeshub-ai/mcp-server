import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OneDriveConfig } from "../models/onedriveconfig.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure OneDrive connector
 *
 * @remarks
 * Set up Microsoft credentials for OneDrive connector.
 */
export declare function connectorOAuthConfigurationSetOneDriveConfig(client$: PipeshubCore, request: OneDriveConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorOAuthConfigurationSetOneDriveConfig.d.ts.map