import * as z from "zod";
export type CreateAgentModelConfig = {
    modelKey?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
};
export declare const CreateAgentModelConfig$zodSchema: z.ZodType<CreateAgentModelConfig>;
/**
 * Request payload
 */
export type CreateAgentRequest = {
    name: string;
    description?: string | undefined;
    systemPrompt?: string | undefined;
    tools?: Array<string> | undefined;
    knowledgeBases?: Array<string> | undefined;
    modelConfig?: CreateAgentModelConfig | undefined;
    isPublic?: boolean | undefined;
};
export declare const CreateAgentRequest$zodSchema: z.ZodType<CreateAgentRequest>;
//# sourceMappingURL=createagentop.d.ts.map