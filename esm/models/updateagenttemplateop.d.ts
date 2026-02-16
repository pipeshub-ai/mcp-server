import * as z from "zod";
export type UpdateAgentTemplateConfigSchema = {};
export declare const UpdateAgentTemplateConfigSchema$zodSchema: z.ZodType<UpdateAgentTemplateConfigSchema>;
/**
 * Request body for Update agent template
 */
export type UpdateAgentTemplateRequestBody = {
    name?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    defaultSystemPrompt?: string | undefined;
    recommendedTools?: Array<string> | undefined;
    configSchema?: UpdateAgentTemplateConfigSchema | undefined;
    isPublic?: boolean | undefined;
};
export declare const UpdateAgentTemplateRequestBody$zodSchema: z.ZodType<UpdateAgentTemplateRequestBody>;
export type UpdateAgentTemplateRequest = {
    templateId: string;
    body: UpdateAgentTemplateRequestBody;
};
export declare const UpdateAgentTemplateRequest$zodSchema: z.ZodType<UpdateAgentTemplateRequest>;
//# sourceMappingURL=updateagenttemplateop.d.ts.map