import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetConnectorRegistryRequest } from "../models/getconnectorregistryop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List available connector types
 *
 * @remarks
 * Get all available connector types from the registry.<br><br>
 * <b>Overview:</b><br>
 * The registry contains all connector types that can be configured as instances.
 * Each type has specific authentication requirements, supported scopes, and capabilities.<br><br>
 * <b>Connector Types Include:</b><br>
 * <ul>
 * <li><b>Google Workspace:</b> Drive, Gmail, Calendar, etc.</li>
 * <li><b>Microsoft 365:</b> OneDrive, Outlook, SharePoint, etc.</li>
 * <li><b>Cloud Storage:</b> Dropbox, Box, AWS S3</li>
 * <li><b>Collaboration:</b> Slack, Confluence, Notion, Jira</li>
 * <li><b>Databases:</b> PostgreSQL, MySQL, MongoDB</li>
 * </ul>
 * <b>Filtering:</b><br>
 * Use <code>scope</code> to filter by team or personal connectors.
 * Use <code>search</code> for full-text search across connector names.
 */
export declare function connectorRegistryList(client$: PipeshubCore, request?: GetConnectorRegistryRequest | undefined, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorRegistryList.d.ts.map