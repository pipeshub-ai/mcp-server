import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateOrganizationRequest } from "../models/createorganizationop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create organization
 *
 * @remarks
 * Create a new organization and its first admin user. This is the initial setup endpoint for new PipesHub installations.<br><br>
 * <b>Overview:</b><br>
 * This endpoint performs the complete initial setup of a PipesHub instance, including creating the organization entity and its first administrator account. Should only be called once during initial setup.<br><br>
 * <b>Setup Flow:</b><br>
 * <ol>
 * <li>Frontend calls <code>/org/exists</code> to check if setup is needed</li>
 * <li>If no organization exists, show setup wizard</li>
 * <li>Collect organization and admin details</li>
 * <li>Call this endpoint to create organization</li>
 * <li>User is automatically logged in as admin</li>
 * </ol>
 * <b>What Gets Created:</b><br>
 * <ul>
 * <li>Organization entity with provided details</li>
 * <li>Admin user account with provided credentials</li>
 * <li>Default user groups (admin, everyone)</li>
 * <li>Default system settings</li>
 * <li>Initial authentication configuration</li>
 * </ul>
 * <b>Account Types:</b><br>
 * <ul>
 * <li><code>individual</code>: Single-user account, limited team features</li>
 * <li><code>business</code>: Multi-user organization with full features</li>
 * </ul>
 * <b>Security:</b><br>
 * <ul>
 * <li>This endpoint only works if no organization exists</li>
 * <li>Password must meet security requirements</li>
 * <li>Email verification may be required based on config</li>
 * </ul>
 */
export declare function organizationsCreateOrganization(client$: PipeshubCore, request: CreateOrganizationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsCreateOrganization.d.ts.map