import * as z from "zod";
import { KnowledgeHubNode } from "./knowledgehubnode.js";
export type GetKnowledgeHubChildNodesRequest = {
    parentType: string;
    parentId: string;
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
};
export declare const GetKnowledgeHubChildNodesRequest$zodSchema: z.ZodType<GetKnowledgeHubChildNodesRequest>;
/**
 * Child nodes retrieved
 */
export type GetKnowledgeHubChildNodesResponse = {
    nodes?: Array<KnowledgeHubNode> | undefined;
    parent?: KnowledgeHubNode | undefined;
};
export declare const GetKnowledgeHubChildNodesResponse$zodSchema: z.ZodType<GetKnowledgeHubChildNodesResponse>;
//# sourceMappingURL=getknowledgehubchildnodesop.d.ts.map