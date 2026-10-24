import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { withoutChatMentions } from "./chat-mentions.js";
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
import { tool$pipeshubCreateCollection } from "./tools/pipeshubCreateCollection.js";
import { tool$pipeshubUpload } from "./tools/pipeshubUpload.js";
import { tool$pipeshubIndexingStatus } from "./tools/pipeshubIndexingStatus.js";
import { tool$pipeshubConnectSource } from "./tools/pipeshubConnectSource.js";
import { createPipeshubAssistantPrompt } from "./prompts/pipeshubAssistant.js";

/**
 * The most array elements and object members one tool call's arguments may
 * hold, counted together at every depth. Without a cap the SDK validates
 * arguments of any size, and one request carrying a huge array can run the
 * server out of memory (GHSA-46jr-4wx8-v453). The curated tools take a query
 * and short lists of ids, so this leaves ample room.
 */
export const DEFAULT_MAX_TOOL_INPUT_ELEMENTS = 10_000;

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
  /**
   * Overrides DEFAULT_MAX_TOOL_INPUT_ELEMENTS. A number of at least 1, or
   * `Infinity` for no cap. A call over the cap is answered with a tool error
   * and its handler never runs.
   */
  maxToolInputElements?: number | undefined;
}) {
  const chat = deps.chat ?? chatEnabledFromEnv();
  const server = new McpServer(
    {
      name: "pipeshub-mcp",
      version: "0.0.4",
    },
    {
      instructions: pipeshubInstructions({ chat }),
      maxToolInputElements:
        deps.maxToolInputElements ?? DEFAULT_MAX_TOOL_INPUT_ELEMENTS,
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
  // Without chat, a description that names pipeshub_chat is mounted with the
  // mention cut, so no tool points the agent at one it cannot see.
  const mount: typeof tool = chat ? tool : (def) => tool(withoutChatMentions(def));
  mount(tool$pipeshubSources);          // 1. discover sources + models
  mount(tool$pipeshubSearch);           // 2. find records for a question
  mount(tool$pipeshubGetRecordContent); // 3. read / navigate / look up records
  mount(tool$pipeshubDownloadRecord);   // 4. fetch a file as stored
  mount(tool$pipeshubDirectory);        // 5. people / groups / teams / whoami
  // Filling the workspace: a server started with `--scope read` leaves out
  // the two that write.
  mount(tool$pipeshubCreateCollection); // 6. new collection to upload into
  mount(tool$pipeshubUpload);           // 7. add documents
  mount(tool$pipeshubIndexingStatus);   // 8. wait until they are searchable
  mount(tool$pipeshubConnectSource);    // 9. link for the human to connect a tool
  if (chat) {
    tool(tool$pipeshubChat);            // 10. optional: PipesHub's assistant
    tool(tool$pipeshubAgents);          // 11. discover org agents (for chat)
  }

  // Curated prompt: user-invokable tool-routing guidance.
  prompt(createPipeshubAssistantPrompt({ chat }));

  if (deps.dynamic) {
    registerDynamicTools(deps.logger, server, getClient, toolMap, scopes);
  }

  return { server, tools };
}
