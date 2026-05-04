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
    serverURL?: string | undefined;
    security?: SDKOptions["security"] | undefined;
    serverIdx?: SDKOptions["serverIdx"] | undefined;
    instance_url?: SDKOptions["instance_url"] | undefined;
}): {
    server: McpServer;
    tools: {
        name: string;
        description: string;
    }[];
};
//# sourceMappingURL=server.d.ts.map