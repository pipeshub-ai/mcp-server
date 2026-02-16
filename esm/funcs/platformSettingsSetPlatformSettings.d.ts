import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { SetPlatformSettingsRequest } from "../models/setplatformsettingsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update platform settings
 *
 * @remarks
 * Configure platform-wide settings including file upload limits and feature flags.
 *
 * **File Upload Limits:**
 * - Default: 30MB (31457280 bytes)
 * - Maximum: 1GB (1073741824 bytes)
 *
 * **Available Feature Flags:**
 * - ENABLE_BETA_CONNECTORS: Enable beta connector integrations (default: false)
 */
export declare function platformSettingsSetPlatformSettings(client$: PipeshubCore, request: SetPlatformSettingsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=platformSettingsSetPlatformSettings.d.ts.map