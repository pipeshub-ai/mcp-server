import * as z from "zod";
import { KnowledgeHubNode } from "./knowledgehubnode.js";
export type GetKnowledgeHubRootNodesRequest = {
    view?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    nodeTypes?: string | undefined;
    q?: string | undefined;
};
export declare const GetKnowledgeHubRootNodesRequest$zodSchema: z.ZodType<GetKnowledgeHubRootNodesRequest>;
/**
 * Root nodes retrieved
 */
export type GetKnowledgeHubRootNodesResponse = {
    nodes?: Array<KnowledgeHubNode> | undefined;
};
export declare const GetKnowledgeHubRootNodesResponse$zodSchema: z.ZodType<GetKnowledgeHubRootNodesResponse>;
//# sourceMappingURL=getknowledgehubrootnodesop.d.ts.map