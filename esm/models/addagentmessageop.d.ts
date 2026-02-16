import * as z from "zod";
import { AddMessageRequest } from "./addmessagerequest.js";
export type AddAgentMessageRequest = {
    agentKey: string;
    conversationId: string;
    body: AddMessageRequest;
};
export declare const AddAgentMessageRequest$zodSchema: z.ZodType<AddAgentMessageRequest>;
//# sourceMappingURL=addagentmessageop.d.ts.map