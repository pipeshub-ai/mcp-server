import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectorGetSignedUrlRequest, ConnectorGetSignedUrlSecurity } from "../models/connectorgetsignedurlop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Connector Service] Get signed URL for record
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Get a signed URL for direct file access from the connector source.<br><br>
 *
 * <b>Service:</b> Connector Service<br>
 * <b>Port:</b> 8088<br>
 * <b>Base URL:</b> <code>http://localhost:8088</code><br><br>
 *
 * <b>Authentication:</b> Requires scoped service token<br><br>
 *
 * <b>Use Case:</b> Generate temporary signed URLs for file downloads from
 * Google Drive, OneDrive, SharePoint, etc.
 */
export declare function connectorServiceGetSignedUrl(client$: PipeshubCore, security: ConnectorGetSignedUrlSecurity, request: ConnectorGetSignedUrlRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorServiceGetSignedUrl.d.ts.map