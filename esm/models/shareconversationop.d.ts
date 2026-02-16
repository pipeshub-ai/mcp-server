import * as z from "zod";
import { ShareRequest } from "./sharerequest.js";
export type ShareConversationRequest = {
    conversationId: string;
    body: ShareRequest;
};
export declare const ShareConversationRequest$zodSchema: z.ZodType<ShareConversationRequest>;
//# sourceMappingURL=shareconversationop.d.ts.map