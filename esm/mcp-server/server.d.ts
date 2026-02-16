import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../core.js";
import { SDKOptions } from "../lib/config.js";
import type { ConsoleLogger } from "./console-logger.js";
import { MCPScope } from "./scopes.js";
export declare function createMCPServer(deps: {
    logger: ConsoleLogger;
    allowedTools?: string[] | undefined;
    dynamic?: boolean | undefined;
    scopes?: MCPScope[] | undefined;
    getSDK?: () => PipeshubCore;
    serverURL: string;
    security?: SDKOptions["security"] | undefined;
    serverIdx?: SDKOptions["serverIdx"] | undefined;
}): {
    server: McpServer;
    tools: {
        name: string;
        description: string;
    }[];
};
//# sourceMappingURL=server.d.ts.map