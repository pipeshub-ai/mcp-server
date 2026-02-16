import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get current organization
 *
 * @remarks
 * Retrieve details about the authenticated user's organization.<br><br>
 * <b>Overview:</b><br>
 * This endpoint returns complete information about the current user's organization, including profile data, settings, and configuration. Use this for organization profile pages and settings.<br><br>
 * <b>Response Includes:</b><br>
 * <ul>
 * <li>Organization profile (name, email, address)</li>
 * <li>Account type and billing status</li>
 * <li>Feature flags and limits</li>
 * <li>Branding settings (logo, colors)</li>
 * <li>Creation and modification timestamps</li>
 * </ul>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>Organization profile pages</li>
 * <li>Settings and configuration screens</li>
 * <li>Billing and subscription displays</li>
 * <li>White-label branding retrieval</li>
 * </ul>
 * <b>Note:</b><br>
 * All authenticated users can access this endpoint to view their organization's details.
 */
export declare function organizationsGetCurrent(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsGetCurrent.d.ts.map