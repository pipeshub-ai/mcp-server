import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const KnowledgeHubNodeType: {
    readonly Kb: "KB";
    readonly Folder: "FOLDER";
    readonly Record: "RECORD";
    readonly Connector: "CONNECTOR";
    readonly App: "APP";
};
export type KnowledgeHubNodeType = ClosedEnum<typeof KnowledgeHubNodeType>;
export declare const KnowledgeHubNodeType$zodSchema: z.ZodEnum<{
    KB: "KB";
    FOLDER: "FOLDER";
    RECORD: "RECORD";
    CONNECTOR: "CONNECTOR";
    APP: "APP";
}>;
export type KnowledgeHubNodeMetadata = {};
export declare const KnowledgeHubNodeMetadata$zodSchema: z.ZodType<KnowledgeHubNodeMetadata>;
/**
 * A node in the knowledge hub tree structure
 */
export type KnowledgeHubNode = {
    id?: string | undefined;
    name?: string | undefined;
    type?: KnowledgeHubNodeType | undefined;
    parentId?: string | undefined;
    hasChildren?: boolean | undefined;
    childCount?: number | undefined;
    metadata?: KnowledgeHubNodeMetadata | undefined;
};
export declare const KnowledgeHubNode$zodSchema: z.ZodType<KnowledgeHubNode>;
//# sourceMappingURL=knowledgehubnode.d.ts.map