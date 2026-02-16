import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteOrganizationRequest } from "../models/deleteorganizationop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete organization
 *
 * @remarks
 * Permanently delete an organization and all associated data.<br><br>
 * <b>WARNING:</b> This action is <b>irreversible</b>.<br><br>
 * <b>Data Deleted:</b><br>
 * <ul>
 * <li>All user accounts in the organization</li>
 * <li>All teams and user groups</li>
 * <li>All documents and storage data</li>
 * <li>All configuration and settings</li>
 * </ul>
 * <b>Requirements:</b><br>
 * <ul>
 * <li>Must be the organization owner (super admin)</li>
 * <li>Must provide confirmation parameter</li>
 * <li>All active subscriptions must be cancelled first</li>
 * </ul>
 */
export declare function organizationsDeleteOrganization(client$: PipeshubCore, request: DeleteOrganizationRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=organizationsDeleteOrganization.d.ts.map