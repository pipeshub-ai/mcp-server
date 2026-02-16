import * as z from "zod";
/**
 * JSON Schema for customization
 */
export type CreateAgentTemplateConfigSchema = {};
export declare const CreateAgentTemplateConfigSchema$zodSchema: z.ZodType<CreateAgentTemplateConfigSchema>;
/**
 * Request payload
 */
export type CreateAgentTemplateRequest = {
    name: string;
    description?: string | undefined;
    category?: string | undefined;
    defaultSystemPrompt?: string | undefined;
    recommendedTools?: Array<string> | undefined;
    configSchema?: CreateAgentTemplateConfigSchema | undefined;
    isPublic?: boolean | undefined;
};
export declare const CreateAgentTemplateRequest$zodSchema: z.ZodType<CreateAgentTemplateRequest>;
//# sourceMappingURL=createagenttemplateop.d.ts.map