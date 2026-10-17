import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { chatEnabledFromEnv } from "./chat-setting.js";
import { pipeshubInstructions } from "./instructions.js";
import { PipeshubCore } from "../core.js";
import { bindNewRequestId } from "../hooks/request-context.js";
import { SDKOptions } from "../lib/config.js";
import type { ConsoleLogger } from "./console-logger.js";
import { stderrDebugLogger } from "./debug-logger.js";
import { createRegisterPrompt } from "./prompts.js";
import {
  createRegisterResource,
  createRegisterResourceTemplate,
} from "./resources.js";
import { MCPScope } from "./scopes.js";
import { createRegisterTool, registerDynamicTools } from "./tools.js";
import { tool$pipeshubChat } from "./tools/pipeshubChat.js";
import { tool$pipeshubSearch } from "./tools/pipeshubSearch.js";
import { tool$pipeshubDownloadRecord } from "./tools/pipeshubDownloadRecord.js";
import { tool$pipeshubGetRecordContent } from "./tools/pipeshubGetRecordContent.js";
import { tool$pipeshubDirectory } from "./tools/pipeshubDirectory.js";
import { tool$pipeshubSources } from "./tools/pipeshubSources.js";
import { tool$pipeshubAgents } from "./tools/pipeshubAgents.js";
import { createPipeshubAssistantPrompt } from "./prompts/pipeshubAssistant.js";

export function createMCPServer(deps: {
  logger: ConsoleLogger;
  allowedTools?: string[] | undefined;
  dynamic?: boolean | undefined;
  scopes?: MCPScope[] | undefined;
  getSDK?: () => PipeshubCore;
  serverURL?: string | undefined;
  security?: SDKOptions["security"] | undefined;
  serverIdx?: SDKOptions["serverIdx"] | undefined;
  instance_url?: SDKOptions["instance_url"] | undefined;
  /**
   * Mount `pipeshub_chat` and `pipeshub_agents`. Defaults to the
   * `PIPESHUB_MCP_CHAT` environment variable, which defaults to on.
   */
  chat?: boolean | undefined;
}) {
  const chat = deps.chat ?? chatEnabledFromEnv();
  const server = new McpServer(
    {
      name: "pipeshub-mcp",
      version: "0.0.4",
    },
    {
      instructions: pipeshubInstructions({ chat }),
    },
  );

  const resolveClient = deps.getSDK || (() =>
    new PipeshubCore({
      security: deps.security,
      serverURL: deps.serverURL,
      serverIdx: deps.serverIdx,
      instance_url: deps.instance_url,
      debugLogger: deps.logger.level === "debug"
        ? stderrDebugLogger()
        : undefined,
    }));

  const getClient = () => {
    bindNewRequestId();
    return resolveClient();
  };

  const scopes = new Set(deps.scopes);

  const allowedTools = deps.allowedTools && new Set(deps.allowedTools);
  const [tool, tools, toolMap] = createRegisterTool(
    deps.logger,
    server,
    getClient,
    scopes,
    allowedTools,
    deps.dynamic,
  );
  const resource = createRegisterResource(
    deps.logger,
    server,
    getClient,
    scopes,
  );
  const resourceTemplate = createRegisterResourceTemplate(
    deps.logger,
    server,
    getClient,
    scopes,
  );
  const prompt = createRegisterPrompt(deps.logger, server, getClient, scopes);
  const register = { tool, resource, resourceTemplate, prompt };
  void register; // suppress unused warnings

  // Curated tool set. Order = preferred discovery order shown to the LLM.
  // Search and read come first: they are the default way to answer. Chat is
  // optional, for clients that cannot run their own retrieval loop (PipesHub's
  // October 2026 evaluation, Claude Opus as the agent: same accuracy, fewer
  // wrong claims, ~$0.20 and ~20 s less per answer without it).
  tool(tool$pipeshubSources);          // 1. discover sources + models
  tool(tool$pipeshubSearch);           // 2. find records for a question
  tool(tool$pipeshubGetRecordContent); // 3. read / navigate / look up records
  tool(tool$pipeshubDownloadRecord);   // 4. fetch a file as stored
  tool(tool$pipeshubDirectory);        // 5. people / groups / teams / whoami
  if (chat) {
    tool(tool$pipeshubChat);           // 6. optional: PipesHub's assistant
    tool(tool$pipeshubAgents);         // 7. discover org agents (for chat)
  }

  // Curated prompt: user-invokable tool-routing guidance.
  prompt(createPipeshubAssistantPrompt({ chat }));

  if (deps.dynamic) {
    registerDynamicTools(deps.logger, server, getClient, toolMap, scopes);
  }

  return { server, tools };
}
