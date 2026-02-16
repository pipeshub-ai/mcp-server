import * as z from "zod";
/**
 * Request payload
 */
export type UpdateKnowledgeBaseRequestBody = {
    kbName?: string | undefined;
};
export declare const UpdateKnowledgeBaseRequestBody$zodSchema: z.ZodType<UpdateKnowledgeBaseRequestBody>;
export type UpdateKnowledgeBaseRequest = {
    kbId: string;
    body: UpdateKnowledgeBaseRequestBody;
};
export declare const UpdateKnowledgeBaseRequest$zodSchema: z.ZodType<UpdateKnowledgeBaseRequest>;
//# sourceMappingURL=updateknowledgebaseop.d.ts.map