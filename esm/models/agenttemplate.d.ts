import * as z from "zod";
/**
 * JSON Schema for template customization options
 */
export type ConfigSchema = {};
export declare const ConfigSchema$zodSchema: z.ZodType<ConfigSchema>;
/**
 * Reusable template for creating agents. Templates define the base
 *
 * @remarks
 * configuration that can be customized when creating an agent instance.
 */
export type AgentTemplate = {
    templateId?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    defaultSystemPrompt?: string | undefined;
    recommendedTools?: Array<string> | undefined;
    configSchema?: ConfigSchema | undefined;
    isPublic?: boolean | undefined;
    createdBy?: string | undefined;
    createdAt?: string | undefined;
};
export declare const AgentTemplate$zodSchema: z.ZodType<AgentTemplate>;
//# sourceMappingURL=agenttemplate.d.ts.map