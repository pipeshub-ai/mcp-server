// Hand-written; replaces the Speakeasy-generated server.ts. Registers the
// five curated PipesHub tools instead of one tool per OpenAPI operation.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Top-level instructions surfaced to the host LLM at server initialize.
// These set defaults so the model picks `pipeshub_chat` as the natural
// entry point for anything that touches the user's PipesHub data —
// documents, files, knowledge base content, citations, etc.
const PIPESHUB_INSTRUCTIONS = `# PipesHub MCP — instructions for the LLM

PipesHub is the user's workplace AI platform. It indexes their documents,
knowledge base content, and connector sources (Drive, Box, Confluence,
Slack, Jira, Gmail, ...). When in doubt, the answer is in PipesHub.

## Default tool: \`pipeshub_chat\`

**Use \`pipeshub_chat\` for any question that could plausibly be answered
by the user's PipesHub-indexed data.** That includes:

- Anything about a specific document, file, report, ticket, message, or
  page (e.g. "what's in the Q4 sales report?", "summarize the langchain
  doc", "what did Aashil say about onboarding?").
- Anything about company / org policies, processes, decisions, or
  history (e.g. "what's our vacation policy?", "who owns the auth
  service?").
- Anything explicitly mentioning PipesHub itself, or its sources
  (Drive / Box / Confluence / Slack / Gmail / Jira / etc.) when the
  user has those connected.
- Open-ended "what do we know about X" questions where the answer
  likely lives in the org's documents.

Do NOT answer those from your own knowledge — \`pipeshub_chat\` grounds
the answer in the user's actual indexed content and returns citations
the user can verify.

## When to use the other tools

- \`pipeshub_search\` — only when the user asks specifically to **find /
  locate** a document by name or topic (so you can hand them a list, or
  resolve a filename to a \`recordId\` for download). For "what does
  the doc say?" use \`pipeshub_chat\` instead — it does the retrieval
  internally.
- \`pipeshub_download_record\` — when the user wants the actual file
  bytes (download, attach, open). Get the \`recordId\` either from
  citations on a prior \`pipeshub_chat\` response or from
  \`pipeshub_search\`.
- \`pipeshub_directory\` — people, groups, teams, and \`whoami\` lookups.
  Not for documents.
- \`pipeshub_sources\` — call once at the start of a session to discover
  which connectors / KB / models are available, then cache the result.

## Conversation lifecycle

\`pipeshub_chat\` is a single tool that handles both starting and
continuing conversations. On the first turn omit \`conversationId\`; on
every subsequent turn pass back the \`conversationId\` returned by the
previous call. Server-side context is preserved — do NOT replay prior
messages. Only start a fresh conversation when the user explicitly
asks to clear context.
`;

import { PipeshubCore } from "../core.js";
import { SDKOptions } from "../lib/config.js";
import type { ConsoleLogger } from "./console-logger.js";
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
import { tool$pipeshubDirectory } from "./tools/pipeshubDirectory.js";
import { tool$pipeshubSources } from "./tools/pipeshubSources.js";

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
}) {
  const server = new McpServer(
    {
      name: "pipeshub-mcp",
      version: "0.0.4",
    },
    {
      instructions: PIPESHUB_INSTRUCTIONS,
    },
  );

  const getClient = deps.getSDK || (() =>
    new PipeshubCore({
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

  // Curated tool set. Five tools instead of ten one-per-op generated tools.
  // Order = preferred discovery order shown to the LLM.
  tool(tool$pipeshubSources);          // 1. discover sources + models
  tool(tool$pipeshubChat);             // 2. ask questions (start + continue)
  tool(tool$pipeshubSearch);           // 3. resolve filename → recordId
  tool(tool$pipeshubDownloadRecord);   // 4. fetch a document by id
  tool(tool$pipeshubDirectory);        // 5. people / groups / teams / whoami

  if (deps.dynamic) {
    registerDynamicTools(deps.logger, server, getClient, toolMap, scopes);
  }

  return { server, tools };
}
