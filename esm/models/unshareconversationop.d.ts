import * as z from "zod";
/**
 * Request payload
 */
export type UnshareConversationRequestBody = {
    userIds: Array<string>;
};
export declare const UnshareConversationRequestBody$zodSchema: z.ZodType<UnshareConversationRequestBody>;
export type UnshareConversationRequest = {
    conversationId: string;
    body: UnshareConversationRequestBody;
};
export declare const UnshareConversationRequest$zodSchema: z.ZodType<UnshareConversationRequest>;
//# sourceMappingURL=unshareconversationop.d.ts.map