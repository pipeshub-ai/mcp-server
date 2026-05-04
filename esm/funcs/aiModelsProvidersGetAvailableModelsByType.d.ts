import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetAvailableModelsByTypeRequest } from "../models/getavailablemodelsbytypeop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * List available AI models of a given type
 *
 * @remarks
 * List every AI model of the requested type that the org has
 * configured. Use this to discover valid `modelKey` values to pass
 * on chat / search requests.<br><br>
 * <b>Typical flow for a programmatic / MCP caller:</b>
 * <ol>
 * <li>Call this endpoint with <code>modelType=llm</code> to find
 *     chat models. Pick the one with <code>isDefault: true</code>
 *     unless the user explicitly asked for another.</li>
 * <li>Pass the chosen <code>modelKey</code> (and optionally
 *     <code>modelName</code>, <code>modelFriendlyName</code>) to
 *     <code>POST /conversations/create</code> /
 *     <code>POST /conversations/{id}/messages</code> /
 *     <code>POST /search</code>.</li>
 * </ol>
 * Other useful `modelType` values: `embedding` (for re-embedding),
 * `ocr`, `multiModal`, `reasoning`, `imageGeneration`, `tts`, `stt`.
 */
export declare function aiModelsProvidersGetAvailableModelsByType(client$: PipeshubCore, request: GetAvailableModelsByTypeRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=aiModelsProvidersGetAvailableModelsByType.d.ts.map