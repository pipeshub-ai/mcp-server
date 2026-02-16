import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateKnowledgeBaseRequest } from "../models/createknowledgebaseop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Create a new knowledge base
 *
 * @remarks
 * Create a new knowledge base for organizing and managing documents within your organization.<br><br>
 * <b>Overview:</b><br>
 * A knowledge base is a container for organizing related documents, files, and content. It provides a central location for teams to collaborate on shared information.<br><br>
 * <b>Features:</b><br>
 * <ul>
 * <li>Hierarchical folder structure support</li>
 * <li>Role-based access control (OWNER, ORGANIZER, WRITER, READER, etc.)</li>
 * <li>Full-text search across all records</li>
 * <li>Integration with external connectors (Google Drive, OneDrive, etc.)</li>
 * <li>Automatic content indexing for AI-powered search</li>
 * </ul>
 * <b>Naming Rules:</b><br>
 * <ul>
 * <li>Name must be 1-255 characters</li>
 * <li>Special characters and HTML tags are sanitized</li>
 * <li>Names don't need to be unique within organization</li>
 * </ul>
 * <b>Creator Permissions:</b><br>
 * The user creating the KB automatically becomes the OWNER with full administrative rights.
 */
export declare function knowledgeBasesCreate(client$: PipeshubCore, request: CreateKnowledgeBaseRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=knowledgeBasesCreate.d.ts.map