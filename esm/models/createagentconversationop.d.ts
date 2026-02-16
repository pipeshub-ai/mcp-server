import * as z from "zod";
import { CreateConversationRequest } from "./createconversationrequest.js";
export type CreateAgentConversationRequest = {
    agentKey: string;
    body: CreateConversationRequest;
};
export declare const CreateAgentConversationRequest$zodSchema: z.ZodType<CreateAgentConversationRequest>;
//# sourceMappingURL=createagentconversationop.d.ts.map