import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { UpdateAgentTemplateRequest } from "../models/updateagenttemplateop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Update agent template
 *
 * @remarks
 * Update an existing agent template.<br><br>
 * <b>Permissions:</b><br>
 * Only the template creator can update it.
 */
export declare function agentTemplatesUpdate(client$: PipeshubCore, request: UpdateAgentTemplateRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentTemplatesUpdate.d.ts.map