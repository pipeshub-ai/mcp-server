import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ReindexFailedConnectorRecordsRequest } from "../models/reindexfailedconnectorrecordsop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reindex failed connector records
 *
 * @remarks
 * Retry indexing for all failed records from a specific connector.<br><br>
 * <b>Use Case:</b><br>
 * After fixing connectivity issues or configuration problems, use this to reprocess all records that failed during the initial sync.
 */
export declare function connectorReindexFailedConnectorRecords(client$: PipeshubCore, request: ReindexFailedConnectorRecordsRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorReindexFailedConnectorRecords.d.ts.map