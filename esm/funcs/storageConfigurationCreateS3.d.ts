import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { CreateS3StorageConfigRequest } from "../models/creates3storageconfigop.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Configure AWS S3 Storage
 *
 * @remarks
 * Configure AWS S3 as the storage backend for file uploads and document storage. Requires an S3 bucket and IAM credentials with appropriate permissions.
 */
export declare function storageConfigurationCreateS3(client$: PipeshubCore, request: CreateS3StorageConfigRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=storageConfigurationCreateS3.d.ts.map