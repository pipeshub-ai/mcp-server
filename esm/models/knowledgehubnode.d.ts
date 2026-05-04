import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of the node
 */
export declare const NodeType: {
    readonly App: "app";
    readonly RecordGroup: "recordGroup";
    readonly Folder: "folder";
    readonly Record: "record";
};
/**
 * Type of the node
 */
export type NodeType = ClosedEnum<typeof NodeType>;
export declare const NodeType$zodSchema: z.ZodEnum<{
    record: "record";
    app: "app";
    recordGroup: "recordGroup";
    folder: "folder";
}>;
/**
 * Origin type
 */
export declare const KnowledgeHubNodeOrigin: {
    readonly Collection: "COLLECTION";
    readonly Connector: "CONNECTOR";
};
/**
 * Origin type
 */
export type KnowledgeHubNodeOrigin = ClosedEnum<typeof KnowledgeHubNodeOrigin>;
export declare const KnowledgeHubNodeOrigin$zodSchema: z.ZodEnum<{
    CONNECTOR: "CONNECTOR";
    COLLECTION: "COLLECTION";
}>;
export type Permission = {
    role?: string | undefined;
    canEdit?: boolean | undefined;
    canDelete?: boolean | undefined;
};
export declare const Permission$zodSchema: z.ZodType<Permission>;
/**
 * A node in the knowledge hub tree structure (NodeItem)
 */
export type KnowledgeHubNode = {
    id?: string | undefined;
    name?: string | undefined;
    nodeType?: NodeType | undefined;
    parentId?: string | null | undefined;
    origin?: KnowledgeHubNodeOrigin | undefined;
    connector?: string | null | undefined;
    recordType?: string | null | undefined;
    recordGroupType?: string | null | undefined;
    indexingStatus?: string | null | undefined;
    reason?: string | null | undefined;
    isInternal?: boolean | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    sizeInBytes?: number | null | undefined;
    mimeType?: string | null | undefined;
    extension?: string | null | undefined;
    webUrl?: string | null | undefined;
    hasChildren?: boolean | undefined;
    previewRenderable?: boolean | null | undefined;
    permission?: Permission | null | undefined;
    sharingStatus?: string | null | undefined;
};
export declare const KnowledgeHubNode$zodSchema: z.ZodType<KnowledgeHubNode>;
//# sourceMappingURL=knowledgehubnode.d.ts.map