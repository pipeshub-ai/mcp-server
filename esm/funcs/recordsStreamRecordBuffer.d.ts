import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { StreamRecordBufferRequest } from "../models/streamrecordbufferop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
export declare enum StreamRecordBufferAcceptEnum {
    applicationJsonAccept = "application/json",
    applicationOctetStreamAccept = "application/octet-stream",
    wildcardRootWildcardAccept = "*/*"
}
/**
 * Stream record content
 *
 * @remarks
 * Stream the binary content of a record's file.<br><br>
 * <b>Overview:</b><br>
 * Proxies the upstream connector backend and pipes the file bytes back
 * to the caller. The response <code>Content-Type</code> and
 * <code>Content-Disposition</code> are forwarded from the upstream — for
 * most records this is <code>application/octet-stream</code> with a
 * filename, but a converted file (see <code>convertTo</code>) returns
 * the converted MIME type (e.g. <code>application/pdf</code>).<br><br>
 * <b>Use Cases:</b><br>
 * <ul>
 * <li>File downloads</li>
 * <li>Inline document preview</li>
 * <li>Content extraction pipelines</li>
 * <li>Tool / MCP callers fetching a document the chat just cited</li>
 * </ul>
 * <b>How a programmatic / MCP caller obtains <code>recordId</code>:</b><br>
 * <ol>
 * <li><b>From a prior chat (preferred).</b> After
 *     <code>POST /conversations/stream</code> emits its <code>complete</code>
 *     SSE frame, walk
 *     <code>conversation.messages[*].citations[*].metadata.recordId</code>
 *     (and <code>metadata.recordName</code> for display) — those are the records
 *     the AI grounded its answer in. Pass any of those ids straight to this
 *     endpoint to download the underlying file.</li>
 * <li><b>From a filename / topic / natural-language description.</b> If the
 *     user gave you a name or topic instead of an id (e.g. "download the
 *     langchain doc"), call <code>POST /search</code> with that phrase as
 *     <code>query</code>. Read the resulting record id from
 *     <code>searchResponse.searchResults[*].metadata.recordId</code>
 *     (or, equivalently, any key in
 *     <code>searchResponse.virtual_to_record_map</code>). If multiple
 *     distinct records match, ask the user to disambiguate before
 *     downloading.</li>
 * </ol>
 * <b>Format Conversion:</b><br>
 * Use <code>convertTo</code> to convert between formats (e.g. DOCX → PDF).
 * When set, the response <code>Content-Type</code> reflects the converted
 * format, not the original.<br><br>
 * <b>Error shape:</b><br>
 * On failure the endpoint returns JSON: <code>{ "error": "..." }</code>
 * with the upstream status code (e.g. 404 for unknown record, 403 if the
 * caller lacks read permission on the record).
 */
export declare function recordsStreamRecordBuffer(client$: PipeshubCore, request: StreamRecordBufferRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=recordsStreamRecordBuffer.d.ts.map