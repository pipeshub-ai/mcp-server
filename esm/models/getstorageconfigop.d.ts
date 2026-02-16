import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Currently configured storage type
 */
export declare const GetStorageConfigStorageType: {
    readonly Local: "local";
    readonly S3: "s3";
    readonly AzureBlob: "azureBlob";
};
/**
 * Currently configured storage type
 */
export type GetStorageConfigStorageType = ClosedEnum<typeof GetStorageConfigStorageType>;
export declare const GetStorageConfigStorageType$zodSchema: z.ZodEnum<{
    local: "local";
    azureBlob: "azureBlob";
    s3: "s3";
}>;
/**
 * Storage configuration retrieved
 */
export type GetStorageConfigResponse = {
    storageType?: GetStorageConfigStorageType | undefined;
    mountName?: string | undefined;
    baseUrl?: string | undefined;
    accessKeyId?: string | undefined;
    secretAccessKey?: string | undefined;
    region?: string | undefined;
    bucketName?: string | undefined;
    containerName?: string | undefined;
    accountName?: string | undefined;
};
export declare const GetStorageConfigResponse$zodSchema: z.ZodType<GetStorageConfigResponse>;
//# sourceMappingURL=getstorageconfigop.d.ts.map