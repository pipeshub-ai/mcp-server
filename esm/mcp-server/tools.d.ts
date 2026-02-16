import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { CallToolResult, ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { PipeshubCore } from "../core.js";
import { ConsoleLogger } from "./console-logger.js";
import { MCPScope } from "./scopes.js";
export type ToolDefinition<Args extends undefined | ZodRawShapeCompat = undefined> = Args extends ZodRawShapeCompat ? {
    name: string;
    description: string;
    scopes?: MCPScope[];
    args: Args;
    annotations: {
        title: string;
        destructiveHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
        readOnlyHint: boolean;
    };
    tool: (client: PipeshubCore, args: ShapeOutput<Args>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>;
} : {
    name: string;
    description: string;
    scopes?: MCPScope[];
    args?: undefined;
    annotations: {
        title: string;
        destructiveHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
        readOnlyHint: boolean;
    };
    tool: (client: PipeshubCore, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => CallToolResult | Promise<CallToolResult>;
};
export declare function formatResult(response: Response): Promise<CallToolResult>;
export declare function createRegisterTool(logger: ConsoleLogger, server: McpServer, getSDK: () => PipeshubCore, allowedScopes: Set<MCPScope>, allowedTools?: Set<string>, dynamic?: boolean): [
    <A extends ZodRawShapeCompat | undefined>(tool: ToolDefinition<A>) => void,
    Array<{
        name: string;
        description: string;
    }>,
    Map<string, ToolDefinition<ZodRawShapeCompat | undefined>>
];
export declare function registerDynamicTools(logger: ConsoleLogger, server: McpServer, getSDK: () => PipeshubCore, toolMap: Map<string, ToolDefinition<ZodRawShapeCompat | undefined>>, allowedScopes: Set<MCPScope>): void;
//# sourceMappingURL=tools.d.ts.map