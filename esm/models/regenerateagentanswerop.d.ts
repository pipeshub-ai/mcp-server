import * as z from "zod";
import { Filters } from "./filters.js";
/**
 * Request payload
 */
export type RegenerateAgentAnswerRequestBody = {
    filters?: Filters | undefined;
    modelKey?: string | undefined;
    chatMode?: string | undefined;
};
export declare const RegenerateAgentAnswerRequestBody$zodSchema: z.ZodType<RegenerateAgentAnswerRequestBody>;
export type RegenerateAgentAnswerRequest = {
    agentKey: string;
    conversationId: string;
    messageId: string;
    body?: RegenerateAgentAnswerRequestBody | undefined;
};
export declare const RegenerateAgentAnswerRequest$zodSchema: z.ZodType<RegenerateAgentAnswerRequest>;
//# sourceMappingURL=regenerateagentanswerop.d.ts.map