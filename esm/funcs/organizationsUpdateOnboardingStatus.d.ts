import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateOnboardingStatusRequest } from "../models/updateonboardingstatusop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update onboarding status
 *
 * @remarks
 * Update the organization's onboarding progress.<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Mark a step as completed</li>
 * <li>Skip optional steps</li>
 * <li>Complete entire onboarding</li>
 * </ul>
 * <b>Behavior:</b><br>
 * <ul>
 * <li>Steps must be completed in order (unless skippable)</li>
 * <li>Completing all required steps marks onboarding as complete</li>
 * </ul>
 */
export declare function organizationsUpdateOnboardingStatus(client$: PipeshubCore, request: UpdateOnboardingStatusRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsUpdateOnboardingStatus.d.ts.map