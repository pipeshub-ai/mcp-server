import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ReindexRecordGroupRequest } from "../models/reindexrecordgroupop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Reindex record group
 *
 * @remarks
 * Trigger reindexing for all records in a folder or knowledge base.<br><br>
 * <b>Overview:</b><br>
 * Batch reindex operation for entire containers. The recordGroupId can be a folder ID or KB ID.
 */
export declare function connectorReindexRecordGroup(client$: PipeshubCore, request: ReindexRecordGroupRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorReindexRecordGroup.d.ts.map