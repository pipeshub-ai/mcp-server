import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OrgAuthConfigCreateRequest } from "../models/orgauthconfigcreaterequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create organization authentication configuration
 *
 * @remarks
 * Create initial organization authentication configuration during onboarding.
 * This endpoint creates a new organization with admin user and default auth settings.
 * <br><br>
 * <b>Note:</b> This is typically called during the initial setup process.
 */
export declare function organizationAuthConfigCreateOrgAuthConfig(client$: PipeshubCore, request: OrgAuthConfigCreateRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationAuthConfigCreateOrgAuthConfig.d.ts.map