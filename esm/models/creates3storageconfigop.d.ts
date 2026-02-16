import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Storage type identifier
 */
export declare const CreateS3StorageConfigStorageType: {
    readonly S3: "s3";
};
/**
 * Storage type identifier
 */
export type CreateS3StorageConfigStorageType = ClosedEnum<typeof CreateS3StorageConfigStorageType>;
export declare const CreateS3StorageConfigStorageType$zodSchema: z.ZodEnum<{
    s3: "s3";
}>;
/**
 * Request body for Configure AWS S3 Storage
 */
export type CreateS3StorageConfigRequest = {
    storageType: CreateS3StorageConfigStorageType;
    s3AccessKeyId: string;
    s3SecretAccessKey: string;
    s3Region: string;
    s3BucketName: string;
};
export declare const CreateS3StorageConfigRequest$zodSchema: z.ZodType<CreateS3StorageConfigRequest>;
//# sourceMappingURL=creates3storageconfigop.d.ts.map