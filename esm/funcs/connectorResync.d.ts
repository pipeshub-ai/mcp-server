import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { ResyncConnectorRequest } from "../models/resyncconnectorop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Resync connector
 *
 * @remarks
 * Trigger a full resync of all records from a connector.<br><br>
 * <b>Overview:</b><br>
 * Fetches all content from the external source and updates local records. Use when you suspect data is out of sync.<br><br>
 * <b>Warning:</b> This can be resource-intensive for large connectors.
 */
export declare function connectorResync(client$: PipeshubCore, request: ResyncConnectorRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorResync.d.ts.map