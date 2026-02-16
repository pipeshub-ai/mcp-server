import * as z from "zod";
/**
 * JSON Schema for tool inputs
 */
export type InputSchema = {};
export declare const InputSchema$zodSchema: z.ZodType<InputSchema>;
/**
 * A tool that agents can use to perform actions
 */
export type AgentTool = {
    key?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    inputSchema?: InputSchema | undefined;
    isEnabled?: boolean | undefined;
};
export declare const AgentTool$zodSchema: z.ZodType<AgentTool>;
//# sourceMappingURL=agenttool.d.ts.map