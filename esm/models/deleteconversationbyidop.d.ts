import * as z from "zod";
export type DeleteConversationByIdRequest = {
    conversationId: string;
};
export declare const DeleteConversationByIdRequest$zodSchema: z.ZodType<DeleteConversationByIdRequest>;
/**
 * Conversation deleted successfully
 */
export type DeleteConversationByIdResponse = {
    message?: string | undefined;
};
export declare const DeleteConversationByIdResponse$zodSchema: z.ZodType<DeleteConversationByIdResponse>;
//# sourceMappingURL=deleteconversationbyidop.d.ts.map