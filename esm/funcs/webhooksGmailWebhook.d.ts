import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * [Connector Service] Gmail webhook
 *
 * @remarks
 * ⚠️ <b>INTERNAL SERVICE ENDPOINT</b><br><br>
 *
 * Webhook endpoint for Gmail Pub/Sub notifications.<br><br>
 *
 * <b>Service:</b> Connector Service<br>
 * <b>Port:</b> 8088<br>
 * <b>Base URL:</b> <code>http://localhost:8088</code><br><br>
 *
 * <b>Authentication:</b> None required - uses Google Pub/Sub verification<br><br>
 *
 * <b>Note:</b> This endpoint receives notifications when new emails arrive
 * or email labels change.
 */
export declare function webhooksGmailWebhook(client$: PipeshubCore, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=webhooksGmailWebhook.d.ts.map