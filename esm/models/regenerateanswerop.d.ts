import * as z from "zod";
import { Filters } from "./filters.js";
/**
 * Request payload
 */
export type RegenerateAnswerRequestBody = {
    filters?: Filters | undefined;
    modelKey?: string | undefined;
    modelName?: string | undefined;
    chatMode?: string | undefined;
};
export declare const RegenerateAnswerRequestBody$zodSchema: z.ZodType<RegenerateAnswerRequestBody>;
export type RegenerateAnswerRequest = {
    conversationId: string;
    messageId: string;
    body?: RegenerateAnswerRequestBody | undefined;
};
export declare const RegenerateAnswerRequest$zodSchema: z.ZodType<RegenerateAnswerRequest>;
//# sourceMappingURL=regenerateanswerop.d.ts.map