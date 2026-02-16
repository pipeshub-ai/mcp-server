import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetInternalUserRequest, GetInternalUserSecurity } from "../models/getinternaluserop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get user (internal service-to-service)
 *
 * @remarks
 * Internal endpoint for service-to-service user lookup. Returns complete user data without privacy masking.<br><br>
 * <b>Overview:</b><br>
 * This internal endpoint provides full user data access for trusted backend services. Unlike public endpoints, it bypasses privacy controls and returns complete user information.<br><br>
 * <b>Security Model:</b><br>
 * <ul>
 * <li>Requires scoped token with USER_LOOKUP privilege</li>
 * <li>Not accessible via regular bearer tokens</li>
 * <li>Intended for trusted internal services only</li>
 * <li>All access is logged for audit purposes</li>
 * </ul>
 * <b>Intended Consumers:</b><br>
 * <ul>
 * <li>Email notification service</li>
 * <li>Analytics and reporting services</li>
 * <li>Audit logging service</li>
 * <li>Integration sync services</li>
 * </ul>
 * <b>Data Returned:</b><br>
 * Complete user object including fields that may be masked in public endpoints (email, phone, etc.).<br><br>
 * <b>Warning:</b><br>
 * This endpoint returns sensitive data. Ensure consuming services handle data according to privacy policies.
 */
export declare function usersGetInternal(client$: PipeshubCore, security: GetInternalUserSecurity, request: GetInternalUserRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=usersGetInternal.d.ts.map