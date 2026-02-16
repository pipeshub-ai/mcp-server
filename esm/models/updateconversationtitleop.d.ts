import * as z from "zod";
/**
 * Request payload
 */
export type UpdateConversationTitleRequestBody = {
    title: string;
};
export declare const UpdateConversationTitleRequestBody$zodSchema: z.ZodType<UpdateConversationTitleRequestBody>;
export type UpdateConversationTitleRequest = {
    conversationId: string;
    body: UpdateConversationTitleRequestBody;
};
export declare const UpdateConversationTitleRequest$zodSchema: z.ZodType<UpdateConversationTitleRequest>;
//# sourceMappingURL=updateconversationtitleop.d.ts.map