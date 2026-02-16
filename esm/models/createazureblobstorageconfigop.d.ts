import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Storage type identifier
 */
export declare const CreateAzureBlobStorageConfigStorageType: {
    readonly AzureBlob: "azureBlob";
};
/**
 * Storage type identifier
 */
export type CreateAzureBlobStorageConfigStorageType = ClosedEnum<typeof CreateAzureBlobStorageConfigStorageType>;
export declare const CreateAzureBlobStorageConfigStorageType$zodSchema: z.ZodEnum<{
    azureBlob: "azureBlob";
}>;
/**
 * Request body for Configure Azure Blob Storage
 */
export type CreateAzureBlobStorageConfigRequest = {
    storageType: CreateAzureBlobStorageConfigStorageType;
    containerName: string;
    azureBlobConnectionString?: string | undefined;
    accountName?: string | undefined;
    accountKey?: string | undefined;
    endpointProtocol?: string | undefined;
    endpointSuffix?: string | undefined;
};
export declare const CreateAzureBlobStorageConfigRequest$zodSchema: z.ZodType<CreateAzureBlobStorageConfigRequest>;
//# sourceMappingURL=createazureblobstorageconfigop.d.ts.map