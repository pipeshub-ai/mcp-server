import * as z from "zod";
export type UpdateAgentModelConfig = {};
export declare const UpdateAgentModelConfig$zodSchema: z.ZodType<UpdateAgentModelConfig>;
/**
 * Request body for Update agent
 */
export type UpdateAgentRequestBody = {
    name?: string | undefined;
    description?: string | undefined;
    systemPrompt?: string | undefined;
    tools?: Array<string> | undefined;
    knowledgeBases?: Array<string> | undefined;
    modelConfig?: UpdateAgentModelConfig | undefined;
    isPublic?: boolean | undefined;
};
export declare const UpdateAgentRequestBody$zodSchema: z.ZodType<UpdateAgentRequestBody>;
export type UpdateAgentRequest = {
    agentKey: string;
    body: UpdateAgentRequestBody;
};
export declare const UpdateAgentRequest$zodSchema: z.ZodType<UpdateAgentRequest>;
//# sourceMappingURL=updateagentop.d.ts.map