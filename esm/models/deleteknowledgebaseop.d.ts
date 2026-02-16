import * as z from "zod";
export type DeleteKnowledgeBaseRequest = {
    kbId: string;
};
export declare const DeleteKnowledgeBaseRequest$zodSchema: z.ZodType<DeleteKnowledgeBaseRequest>;
/**
 * Knowledge base deleted successfully
 */
export type DeleteKnowledgeBaseResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteKnowledgeBaseResponse$zodSchema: z.ZodType<DeleteKnowledgeBaseResponse>;
//# sourceMappingURL=deleteknowledgebaseop.d.ts.map