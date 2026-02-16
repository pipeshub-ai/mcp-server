import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { DocumentVersion } from "./documentversion.js";
/**
 * Default permission level for shared access
 */
export declare const Permissions: {
    readonly Owner: "owner";
    readonly Editor: "editor";
    readonly Commentator: "commentator";
    readonly Readonly: "readonly";
};
/**
 * Default permission level for shared access
 */
export type Permissions = ClosedEnum<typeof Permissions>;
export declare const Permissions$zodSchema: z.ZodEnum<{
    readonly: "readonly";
    owner: "owner";
    editor: "editor";
    commentator: "commentator";
}>;
export type CustomMetadatum = {
    key?: string | undefined;
    value?: string | undefined;
};
export declare const CustomMetadatum$zodSchema: z.ZodType<CustomMetadatum>;
/**
 * Storage backend where the file is stored
 */
export declare const StorageVendor: {
    readonly S3: "s3";
    readonly AzureBlob: "azureBlob";
    readonly Local: "local";
};
/**
 * Storage backend where the file is stored
 */
export type StorageVendor = ClosedEnum<typeof StorageVendor>;
export declare const StorageVendor$zodSchema: z.ZodEnum<{
    local: "local";
    azureBlob: "azureBlob";
    s3: "s3";
}>;
/**
 * S3-specific storage information (if storageVendor is s3)
 */
export type DocumentS3 = {
    url?: string | undefined;
};
export declare const DocumentS3$zodSchema: z.ZodType<DocumentS3>;
/**
 * Azure Blob-specific storage information (if storageVendor is azureBlob)
 */
export type DocumentAzureBlob = {
    url?: string | undefined;
};
export declare const DocumentAzureBlob$zodSchema: z.ZodType<DocumentAzureBlob>;
/**
 * Local storage-specific information (if storageVendor is local)
 */
export type DocumentLocal = {
    url?: string | undefined;
    localPath?: string | undefined;
};
export declare const DocumentLocal$zodSchema: z.ZodType<DocumentLocal>;
/**
 * Represents a document stored in PipesHub storage system. Documents can be versioned to maintain complete history of changes. Supports multiple storage backends (S3, Azure Blob, Local).
 *
 * @remarks
 */
export type Document = {
    _id: string;
    documentName: string;
    alternateDocumentName?: string | undefined;
    documentPath?: string | undefined;
    isVersionedFile: boolean;
    orgId: string;
    permissions?: Permissions | undefined;
    initiatorUserId?: string | undefined;
    sizeInBytes?: number | undefined;
    mimeType?: string | undefined;
    extension?: string | undefined;
    mutationCount?: number | undefined;
    versionHistory?: Array<DocumentVersion> | undefined;
    customMetadata?: Array<CustomMetadatum> | undefined;
    tags?: Array<string> | undefined;
    storageVendor: StorageVendor;
    s3?: DocumentS3 | undefined;
    azureBlob?: DocumentAzureBlob | undefined;
    local?: DocumentLocal | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    isDeleted?: boolean | undefined;
    deletedByUserId?: string | undefined;
};
export declare const Document$zodSchema: z.ZodType<Document>;
//# sourceMappingURL=document.d.ts.map