import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { URLConfig } from "../models/urlconfig.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Set frontend public URL
 *
 * @remarks
 * Configure the public URL where the frontend application is accessible. Used for OAuth redirects and email links.
 */
export declare function publicURLsSetFrontendPublicUrl(client$: PipeshubCore, request: URLConfig, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=publicURLsSetFrontendPublicUrl.d.ts.map