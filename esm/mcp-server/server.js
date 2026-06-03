import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PIPESHUB_INSTRUCTIONS } from "./instructions.js";
import { PipeshubCore } from "../core.js";
import { createRegisterPrompt } from "./prompts.js";
import { createRegisterResource, createRegisterResourceTemplate, } from "./resources.js";
import { createRegisterTool, registerDynamicTools } from "./tools.js";
import { tool$pipeshubChat } from "./tools/pipeshubChat.js";
import { tool$pipeshubSearch } from "./tools/pipeshubSearch.js";
import { tool$pipeshubDownloadRecord } from "./tools/pipeshubDownloadRecord.js";
import { tool$pipeshubDirectory } from "./tools/pipeshubDirectory.js";
import { tool$pipeshubSources } from "./tools/pipeshubSources.js";
import { tool$pipeshubAgents } from "./tools/pipeshubAgents.js";
import { prompt$pipeshubAssistant } from "./prompts/pipeshubAssistant.js";
export function createMCPServer(deps) {
    const server = new McpServer({
        name: "pipeshub-mcp",
        version: "0.0.4",
    }, {
        instructions: PIPESHUB_INSTRUCTIONS,
    });
    const getClient = deps.getSDK || (() => new PipeshubCore({
        security: deps.security,
        serverURL: deps.serverURL,
        serverIdx: deps.serverIdx,
        instance_url: deps.instance_url,
        debugLogger: deps.logger.level === "debug"
            ? {
                log: (...args) => console.log(...args),
                group: (...args) => console.group(...args),
                groupEnd: (...args) => console.groupEnd(...args),
            }
            : undefined,
    }));
    const scopes = new Set(deps.scopes);
    const allowedTools = deps.allowedTools && new Set(deps.allowedTools);
    const [tool, tools, toolMap] = createRegisterTool(deps.logger, server, getClient, scopes, allowedTools, deps.dynamic);
    const resource = createRegisterResource(deps.logger, server, getClient, scopes);
    const resourceTemplate = createRegisterResourceTemplate(deps.logger, server, getClient, scopes);
    const prompt = createRegisterPrompt(deps.logger, server, getClient, scopes);
    const register = { tool, resource, resourceTemplate, prompt };
    void register; // suppress unused warnings
    // Curated tool set. Order = preferred discovery order shown to the LLM.
    tool(tool$pipeshubSources); // 1. discover sources + models
    tool(tool$pipeshubChat); // 2. ask questions (start + continue)
    tool(tool$pipeshubSearch); // 3. resolve filename → recordId
    tool(tool$pipeshubDownloadRecord); // 4. fetch a document by id
    tool(tool$pipeshubDirectory); // 5. people / groups / teams / whoami
    tool(tool$pipeshubAgents); // 6. discover org agents
    // Curated prompt: user-invokable tool-routing guidance.
    prompt(prompt$pipeshubAssistant);
    if (deps.dynamic) {
        registerDynamicTools(deps.logger, server, getClient, toolMap, scopes);
    }
    return { server, tools };
}
//# sourceMappingURL=server.js.map