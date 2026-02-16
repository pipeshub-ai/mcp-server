import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { DeleteAgentTemplateRequest } from "../models/deleteagenttemplateop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Delete agent template
 *
 * @remarks
 * Delete an agent template.<br><br>
 * <b>Note:</b><br>
 * Existing agents created from this template are not affected.
 */
export declare function agentTemplatesDeleteAgentTemplate(client$: PipeshubCore, request: DeleteAgentTemplateRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=agentTemplatesDeleteAgentTemplate.d.ts.map