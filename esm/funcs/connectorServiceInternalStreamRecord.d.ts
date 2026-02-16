import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectorInternalStreamRecordRequest, ConnectorInternalStreamRecordSecurity } from "../models/connectorinternalstreamrecordop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Connector Service] Internal stream record
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Internal endpoint for streaming record content (service-to-service).<br><br>
 *
 * <b>Service:</b> Connector Service<br>
 * <b>Port:</b> 8088<br>
 * <b>Base URL:</b> <code>http://localhost:8088</code><br><br>
 *
 * <b>Authentication:</b> Requires scoped service token<br><br>
 *
 * <b>Use Case:</b> Used by Indexing Service to fetch file content for processing.
 */
export declare function connectorServiceInternalStreamRecord(client$: PipeshubCore, security: ConnectorInternalStreamRecordSecurity, request: ConnectorInternalStreamRecordRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorServiceInternalStreamRecord.d.ts.map