import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequest,
  CallToolResult,
  InitializeRequest,
  InitializeRequestSchema,
  InitializeResult,
} from "@modelcontextprotocol/sdk/types.js";

import { withoutChatMentions } from "./chat-mentions.js";
import { chatEnabledFromEnv } from "./chat-setting.js";
import { pipeshubInstructions, SHOW_CITATIONS_STEP } from "./instructions.js";
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
import { createRegisterTool, registerDynamicTools, ToolDefinition } from "./tools.js";
import { createChatTool, tool$pipeshubChat } from "./tools/pipeshubChat.js";
import { requiredOAuthScopes } from "./oauth-scopes.js";
import { tool$pipeshubSearch } from "./tools/pipeshubSearch.js";
import { tool$pipeshubDownloadRecord } from "./tools/pipeshubDownloadRecord.js";
import { tool$pipeshubGetRecordContent } from "./tools/pipeshubGetRecordContent.js";
import { tool$pipeshubDirectory } from "./tools/pipeshubDirectory.js";
import { tool$pipeshubSources } from "./tools/pipeshubSources.js";
import { tool$pipeshubAgents } from "./tools/pipeshubAgents.js";
import { tool$pipeshubPreviewRecord } from "./tools/pipeshubPreviewRecord.js";
import { tool$pipeshubShowCitations } from "./tools/pipeshubShowCitations.js";
import {
  callerKey,
  clientShowsApps,
  recallApps,
  registerCitationViewer,
  rememberApps,
} from "./citation-viewer.js";
import { withoutCitations } from "./cite.js";
import { tool$pipeshubAddWebSource } from "./tools/pipeshubAddWebSource.js";
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

/** What `onToolCall` is told about one tool call. Never the arguments' values. */
export interface ToolCallEvent {
  tool: string;
  durationMs: number;
  isError: boolean;
  argumentNames: string[];
}

/**
 * Report every `tools/call` to `onToolCall`, including calls refused before a
 * handler runs (unknown tool, invalid arguments) and tools a host registers
 * on this server later. The report is queued after the call, and nothing it
 * throws or rejects with reaches the call.
 */
function observeToolCalls(server: McpServer, onToolCall: (e: ToolCallEvent) => void) {
  const handlers = (server.server as unknown as {
    _requestHandlers: Map<string, (request: CallToolRequest, extra: unknown) => Promise<unknown>>;
  })._requestHandlers;
  const call = handlers.get("tools/call");
  if (!call) return;
  handlers.set("tools/call", async (request, extra) => {
    const started = performance.now();
    let isError = true;
    try {
      const result = await call(request, extra);
      isError = (result as CallToolResult | undefined)?.isError === true;
      return result;
    } finally {
      const event: ToolCallEvent = {
        tool: request.params.name,
        durationMs: performance.now() - started,
        isError,
        argumentNames: Object.keys(request.params.arguments ?? {}),
      };
      queueMicrotask(() => {
        try {
          void Promise.resolve(onToolCall(event)).catch(() => {});
        } catch {
          // a failing observer must not fail the call
        }
      });
    }
  });
}

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
   * Whether the client shows MCP Apps views, such as the citations card.
   * Unset: the client's `initialize` says; until it has, yes.
   */
  apps?: boolean | undefined;
  /**
   * Overrides DEFAULT_MAX_TOOL_INPUT_ELEMENTS. A number of at least 1, or
   * `Infinity` for no cap. A call over the cap is answered with a tool error
   * and its handler never runs.
   */
  maxToolInputElements?: number | undefined;
  /**
   * The PipesHub OAuth scopes the caller's token holds. When given, only the
   * tools whose `requiredOAuthScopes` are all held are registered, so
   * `tools/list` offers nothing that would answer 403. Unset: every tool.
   */
  grantedOAuthScopes?: readonly string[] | undefined;
  /**
   * Whether `pipeshub_chat` may run the user's connected actions (create a
   * ticket, send an email), in plain and agent chats. Defaults to true. False
   * sends no tools with any turn and says so in its description.
   */
  allowChatActions?: boolean | undefined;
  /**
   * Called once after every tool call, whether it succeeded, returned an
   * error result or threw. It runs after the call and cannot fail it.
   */
  onToolCall?: ((e: ToolCallEvent) => void) | undefined;
}) {
  const granted = deps.grantedOAuthScopes && new Set(deps.grantedOAuthScopes);
  const permitted = (name: string): boolean => {
    if (!granted) return true;
    // A tool with no scope entry is left out rather than offered unchecked.
    const needs = requiredOAuthScopes(name);
    return needs !== undefined && needs.every((s) => granted.has(s));
  };
  // A token that cannot chat gets the server without chat, so no text points at it.
  const chat = (deps.chat ?? chatEnabledFromEnv()) && permitted(tool$pipeshubChat.name);
  const actions = deps.allowChatActions ?? true;
  const server = new McpServer(
    {
      name: "pipeshub-mcp",
      version: "0.0.4",
    },
    {
      instructions: pipeshubInstructions({ chat, actions }),
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
  const [registerTool, tools, toolMap] = createRegisterTool(
    deps.logger,
    server,
    getClient,
    scopes,
    allowedTools,
    deps.dynamic,
  );
  const tool: typeof registerTool = (def) => {
    if (permitted(def.name)) registerTool(def);
  };
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

  // Whether the client shows MCP Apps views. One that does not gets no
  // citation tools, no cite codes and no step asking for the card, so it
  // makes no extra call. The host may say; else the client's `initialize`
  // does, kept per caller for a stateless server's later requests.
  let apps = deps.apps;
  let caller: string | undefined;
  // Looked up when a request needs it: a client may have no credential yet.
  const lookUpCaller = () => {
    try {
      return callerKey(resolveClient());
    } catch {
      return undefined;
    }
  };
  const showsApps = () => apps ?? recallApps(caller ??= lookUpCaller()) ?? true;
  const cited = <T extends ToolDefinition<any>>(def: T): T => {
    const run = def.tool as (...a: unknown[]) => Promise<CallToolResult>;
    return {
      ...def,
      tool: async (...a: unknown[]) => {
        const result = await run(...a);
        return showsApps() ? result : withoutCitations(result);
      },
    };
  };

  mount(tool$pipeshubSources);          // 1. discover sources + models
  mount(cited(tool$pipeshubSearch));    // 2. find records for a question
  mount(cited(tool$pipeshubGetRecordContent)); // 3. read / navigate / look up records
  mount(tool$pipeshubDownloadRecord);   // 4. fetch a file as stored
  mount(tool$pipeshubDirectory);        // 5. people / groups / teams / whoami
  // Filling the workspace: a server started with `--scope read` leaves out
  // the ones that write.
  mount(tool$pipeshubCreateCollection); // 6. new collection to upload into
  mount(tool$pipeshubUpload);           // 7. add documents
  mount(tool$pipeshubIndexingStatus);   // 8. wait until they are searchable
  mount(tool$pipeshubConnectSource);    // 9. link for the human to connect a tool
  mount(tool$pipeshubAddWebSource);     // 10. crawl a website (`connect` scope)
  if (chat) {
    tool(cited(createChatTool({ actions }))); // 11. optional: PipesHub's assistant
    tool(tool$pipeshubAgents);          // 12. discover org agents (for chat)
  }
  // The answer's sources, shown before it: the model passes the cite codes
  // of the passages it relies on. MCP Apps hosts show them in the citation
  // viewer, which loads a cited file through the app-only preview tool.
  mount(tool$pipeshubShowCitations);
  tool(tool$pipeshubPreviewRecord);
  registerCitationViewer(server);
  // Listed, and callable, only for a client that shows views. A getter, so
  // it follows the client's answer without a list-changed notification.
  const registered = (server as unknown as {
    _registeredTools: Record<string, RegisteredTool | undefined>;
  })._registeredTools;
  for (const name of [tool$pipeshubShowCitations.name, tool$pipeshubPreviewRecord.name]) {
    if (registered[name]) Object.defineProperty(registered[name], "enabled", { get: showsApps });
  }

  const initialize = (server.server as unknown as {
    _oninitialize(request: InitializeRequest): Promise<InitializeResult>;
  })._oninitialize.bind(server.server);
  server.server.setRequestHandler(InitializeRequestSchema, async (request) => {
    const result = await initialize(request);
    if (deps.apps === undefined) {
      apps = clientShowsApps(request.params.capabilities);
      rememberApps(caller ??= lookUpCaller(), apps);
    }
    // Cut from the text sent, which a host may have added to.
    if (!showsApps() && result.instructions) {
      result.instructions = result.instructions.replace(SHOW_CITATIONS_STEP, "");
    }
    return result;
  });

  // Curated prompt: user-invokable tool-routing guidance.
  prompt(createPipeshubAssistantPrompt({ chat, actions, showsApps }));

  if (deps.dynamic) {
    registerDynamicTools(deps.logger, server, getClient, toolMap, scopes);
  }

  if (deps.onToolCall) observeToolCalls(server, deps.onToolCall);

  // The SDK advertises listChanged as soon as anything is registered, but
  // this server never sends the notifications: every tool is registered
  // before connect, and the citation tools follow `initialize` without one.
  // PipesHub's /mcp also builds a server per request, which could not send
  // one at all. So no client should wait for them.
  server.server.registerCapabilities({
    tools: { listChanged: false },
    prompts: { listChanged: false },
    resources: { listChanged: false },
  });

  return { server, tools };
}
