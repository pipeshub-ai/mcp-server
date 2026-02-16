import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { ConnectorConvertRecordBufferRequest, ConnectorConvertRecordBufferSecurity } from "../models/connectorconvertrecordbufferop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Connector Service] Convert record buffer
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Convert a record buffer to a different format.<br><br>
 *
 * <b>Service:</b> Connector Service<br>
 * <b>Port:</b> 8088<br>
 * <b>Base URL:</b> <code>http://localhost:8088</code><br><br>
 *
 * <b>Authentication:</b> Requires scoped service token<br><br>
 *
 * <b>Supported Conversions:</b> PDF to text, DOCX to text, etc.
 */
export declare function connectorServiceConvertRecordBuffer(client$: PipeshubCore, security: ConnectorConvertRecordBufferSecurity, request: ConnectorConvertRecordBufferRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorServiceConvertRecordBuffer.d.ts.map