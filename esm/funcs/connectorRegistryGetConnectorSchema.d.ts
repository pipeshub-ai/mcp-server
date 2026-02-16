import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { GetConnectorSchemaRequest } from "../models/getconnectorschemaop.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Get connector configuration schema
 *
 * @remarks
 * Get the configuration schema for a specific connector type.<br><br>
 * <b>Overview:</b><br>
 * Returns JSON Schema definitions for authentication, sync settings, and
 * filter options. Use this to dynamically build configuration forms.<br><br>
 * <b>Schema Sections:</b><br>
 * <ul>
 * <li><b>authSchema:</b> Fields for authentication (credentials, tokens)</li>
 * <li><b>syncSchema:</b> Sync settings (schedule, incremental options)</li>
 * <li><b>filterSchema:</b> Filter field definitions</li>
 * </ul>
 */
export declare function connectorRegistryGetConnectorSchema(client$: PipeshubCore, request: GetConnectorSchemaRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=connectorRegistryGetConnectorSchema.d.ts.map