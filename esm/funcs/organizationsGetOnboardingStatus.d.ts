import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get onboarding status
 *
 * @remarks
 * Retrieve the organization's onboarding progress and status.<br><br>
 * <b>Response Details:</b><br>
 * <ul>
 * <li>Current onboarding step</li>
 * <li>Completion status of each step</li>
 * <li>Overall completion percentage</li>
 * </ul>
 * <b>Onboarding Steps:</b><br>
 * <ul>
 * <li>Organization profile setup</li>
 * <li>Admin account configuration</li>
 * <li>Invite team members</li>
 * <li>Connect integrations</li>
 * <li>Configure settings</li>
 * </ul>
 */
export declare function organizationsGetOnboardingStatus(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsGetOnboardingStatus.d.ts.map