import * as z from "zod";
import { MessageFeedback } from "./messagefeedback.js";
export type UpdateMessageFeedbackRequest = {
    conversationId: string;
    messageId: string;
    body: MessageFeedback;
};
export declare const UpdateMessageFeedbackRequest$zodSchema: z.ZodType<UpdateMessageFeedbackRequest>;
//# sourceMappingURL=updatemessagefeedbackop.d.ts.map