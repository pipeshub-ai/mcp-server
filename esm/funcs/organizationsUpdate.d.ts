import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateOrganizationRequest } from "../models/updateorganizationop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update organization
 *
 * @remarks
 * Update organization profile and settings information.<br><br>
 * <b>Overview:</b><br>
 * This endpoint allows administrators to update the organization's profile information, contact details, and address. Used in the organization settings section of the admin panel.<br><br>
 * <b>Updatable Fields:</b><br>
 * <ul>
 * <li><code>registeredName</code>: Official registered/legal name of the organization</li>
 * <li><code>shortName</code>: Short display name used in UI</li>
 * <li><code>phoneNumber</code>: Primary contact phone number</li>
 * <li><code>permanentAddress</code>: Full address object with street, city, state, country, postal code</li>
 * </ul>
 * <b>Restrictions:</b><br>
 * <ul>
 * <li>Only organization admins can perform updates</li>
 * <li>Contact email cannot be changed through this endpoint</li>
 * <li>Account type cannot be changed after creation</li>
 * </ul>
 * <b>Side Effects:</b><br>
 * <ul>
 * <li>Organization update event is published</li>
 * <li>Cached organization data is invalidated</li>
 * <li>Changes are reflected immediately across all services</li>
 * </ul>
 * <b>Validation:</b><br>
 * <ul>
 * <li>Phone number must be valid international format</li>
 * <li>Address fields have maximum length constraints</li>
 * <li>Names cannot be empty if provided</li>
 * </ul>
 */
export declare function organizationsUpdate(client$: PipeshubCore, request: UpdateOrganizationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsUpdate.d.ts.map