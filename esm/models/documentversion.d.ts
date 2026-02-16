import * as z from "zod";
/**
 * S3 storage URL for this version
 */
export type DocumentVersionS3 = {
    url?: string | undefined;
};
export declare const DocumentVersionS3$zodSchema: z.ZodType<DocumentVersionS3>;
/**
 * Azure Blob storage URL for this version
 */
export type DocumentVersionAzureBlob = {
    url?: string | undefined;
};
export declare const DocumentVersionAzureBlob$zodSchema: z.ZodType<DocumentVersionAzureBlob>;
/**
 * Local storage path for this version
 */
export type DocumentVersionLocal = {
    url?: string | undefined;
    localPath?: string | undefined;
};
export declare const DocumentVersionLocal$zodSchema: z.ZodType<DocumentVersionLocal>;
/**
 * Represents a single version entry in a document's version history
 */
export type DocumentVersion = {
    version?: number | undefined;
    userAssignedVersionLabel?: string | undefined;
    note?: string | undefined;
    extension?: string | undefined;
    size?: number | undefined;
    mutationCount?: number | undefined;
    s3?: DocumentVersionS3 | undefined;
    azureBlob?: DocumentVersionAzureBlob | undefined;
    local?: DocumentVersionLocal | undefined;
    createdAt?: number | undefined;
    initiatedByUserId?: string | undefined;
};
export declare const DocumentVersion$zodSchema: z.ZodType<DocumentVersion>;
//# sourceMappingURL=documentversion.d.ts.map