import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateAzureBlobStorageConfigRequest } from "../models/createazureblobstorageconfigop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure Azure Blob Storage
 *
 * @remarks
 * Configure Azure Blob Storage as the storage backend. You can provide either:
 * - A full connection string (azureBlobConnectionString), OR
 * - Individual credentials (accountName, accountKey, endpointProtocol, endpointSuffix)
 */
export declare function storageConfigurationsCreateAzureBlob(client$: PipeshubCore, request: CreateAzureBlobStorageConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=storageConfigurationsCreateAzureBlob.d.ts.map