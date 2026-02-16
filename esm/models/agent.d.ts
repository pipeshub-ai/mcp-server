import * as z from "zod";
/**
 * AI model configuration
 */
export type ModelConfig = {
    modelKey?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
};
export declare const ModelConfig$zodSchema: z.ZodType<ModelConfig>;
/**
 * A custom AI agent with specialized capabilities, tools, and knowledge scope.
 *
 * @remarks
 * Agents can be configured for specific use cases like customer support,
 * code review, or domain-specific Q&A.
 */
export type Agent = {
    agentKey?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    systemPrompt?: string | undefined;
    tools?: Array<string> | undefined;
    knowledgeBases?: Array<string> | undefined;
    modelConfig?: ModelConfig | undefined;
    isPublic?: boolean | undefined;
    createdBy?: string | undefined;
    orgId?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const Agent$zodSchema: z.ZodType<Agent>;
//# sourceMappingURL=agent.d.ts.map