// `POST /conversations/stream` (and
// `POST /conversations/{conversationId}/messages/stream` for follow-ups),
// accumulate the frames server-side, and hand the LLM a single trimmed
// `CallToolResult` once the stream reaches a terminal frame.
//
// The wire protocol is AG-UI. The legacy `connected` / `answer_chunk` /
// `complete` / `error` vocabulary was removed with the new agent loop and is
// never emitted. The frames that matter — CUSTOM{conversation_created},
// TEXT_MESSAGE_CONTENT, RUN_FINISHED, RUN_ERROR — are folded by `./_agui.js`,
// which is kept separate so the fold stays a pure function over frames.

import * as z from "zod";
import { conversationsStreamConversation } from "../../funcs/conversationsStreamConversation.js";
import { conversationsStreamMessage } from "../../funcs/conversationsStreamMessage.js";
import { agentsStreamConversation } from "../../funcs/agentsStreamConversation.js";
import { agentsStreamMessage } from "../../funcs/agentsStreamMessage.js";
import { ToolDefinition } from "../tools.js";
import {
  applyAGUIFrame,
  newChatStreamState,
  salvagedText,
} from "./_agui.js";
import {
  errorResult,
  httpErrorResult,
  iterateSSE,
  jsonResult,
  trimConversation,
} from "./_helpers.js";

const FiltersShape = z.object({
  apps: z.array(z.string()).optional().describe(
    "Source-scoping ids from `pipeshub_sources` — connector instance and / "
      + "or knowledge base ids, mixed freely. The legacy org-wide "
      + "`knowledgeBase_<orgId>` id is still accepted on deployments that "
      + "predate per-KB sources. Empty / omitted means no app-side "
      + "restriction.",
  ),
  kb: z.array(z.string()).optional().describe(
    "Legacy / unused. Leave empty.",
  ),
}).optional();

const args = {
  query: z.string().min(1).describe(
    "The user's question or message for this turn.",
  ),
  conversationId: z.string().optional().describe(
    "Existing conversation id to continue. Omit on the FIRST turn; on every "
      + "subsequent turn pass the `conversationId` returned by the previous "
      + "call. Server-side message history is preserved — do NOT replay "
      + "prior messages.",
  ),
  filters: FiltersShape.describe(
    "Source scoping for retrieval. Pass `apps` ids from `pipeshub_sources`. "
      + "Only meaningful on the FIRST turn (when starting a new conversation).",
  ),
  modelKey: z.string().optional().describe(
    "Model id to use (from `pipeshub_sources` `llmModels[*].modelKey`). "
      + "Defaults to the org's default LLM.",
  ),
  modelName: z.string().optional(),
  modelFriendlyName: z.string().optional(),
  agentId: z.string().optional().describe(
    "Optional PipesHub agent to converse with — the `agentId` from "
      + "`pipeshub_agents`. When set, this turn runs against that agent's "
      + "configuration (prompt, tools, knowledge). On follow-up turns pass the "
      + "SAME `agentId` together with the `conversationId` returned by the "
      + "previous call. Omit for a plain (non-agent) conversation. If unsure "
      + "which agent to use, call `pipeshub_agents` first to see the options.",
  ),
  chatMode: z.enum([
    "internal_search",
    "web_search",
    "quick",
  ]).optional().describe(
    "Response strategy. The valid values depend on whether `agentId` is set:\n"
      + "- WITHOUT `agentId` (plain chat): `internal_search` — answer from the "
      + "org's indexed knowledge (default) — or `web_search` — answer from the "
      + "live web.\n"
      + "- WITH `agentId` (agent chat): `quick` is the only supported mode and "
      + "is sent automatically, so this argument can be omitted.",
  ),
};

export const tool$pipeshubChat: ToolDefinition<typeof args> = {
  name: "pipeshub_chat",
  description:
    `Ask a question, get an answer grounded in the org's indexed data with
citations. It reads a few retrieved passages — never a whole document,
never a complete list.

**Three questions this tool gets WRONG. Check them first:**
- **Structure** — "what's under this epic?", "which pages are in this
  space?", "what links to this ticket?", "what's in this folder?" →
  \`pipeshub_get_record_content\` \`mode:"navigate"\`. Ranking cannot see how
  records relate.
- **Exhaustive** — "how many X?", "list ALL the Y", "every Z" →
  \`mode:"navigate"\`, which reports the group's real total. This tool
  undercounts and will not say so.
- **One named document** — summarize it, extract from it, what does it say
  about X → \`pipeshub_search\` for the \`recordId\`, then \`mode:"content"\`.

Everything else about the org's knowledge belongs here: policies,
processes, decisions, history, "what do we know about X", and any question
spanning several documents.

**Internal search** (default, \`chatMode: "internal_search"\`): the user's
documents, files, knowledge base, company policies — anything in their
PipesHub-indexed sources (Drive, Box, Confluence, Slack, Gmail, Jira, the
org's KB, ...).

**Web search** (\`chatMode: "web_search"\`): current events or public
information unlikely to be in the org's knowledge base.

Both are plain-chat modes. **Agent chat** — pass an \`agentId\` from
\`pipeshub_agents\` — runs against that agent's own prompt, tools and knowledge;
\`quick\` is its only mode, requires the \`agentId\`, and is sent automatically.

- "What's our policy on Y?" → \`pipeshub_chat\` (internal_search)
- "What's in the news about Z?" → \`pipeshub_chat\` (web_search)
- "Find / locate the file named X" → \`pipeshub_search\` (then
  \`pipeshub_download_record\` if the user wants the bytes).

**Conversation lifecycle** — one tool, both start and continue:

- **First turn**: omit \`conversationId\`. The server creates a new
  conversation; capture \`conversationId\` from the response.
- **Follow-up turn**: pass the \`conversationId\` from the previous
  response. Server-side context is preserved — do NOT replay earlier
  messages, and \`filters\` is ignored on follow-ups (set once at
  creation).

Only re-omit \`conversationId\` (start a fresh conversation) when the
user explicitly asks to start over / clear context.

The response contains the AI's \`answer\` plus \`citations\`. To download a
cited document, take \`citations[*].recordId\` and call
\`pipeshub_download_record\`.`,
  scopes: ["read"],
  annotations: {
    title: "Chat with PipesHub",
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const fetchOptions = { signal: ctx.signal };
    // `quick` is agent-only. The plain stream schemas accept internal_search /
    // web_search / agent, so collapse anything else to the default rather than
    // forwarding a value that path would reject.
    const plainChatMode = args.chatMode === "web_search"
      ? "web_search"
      : "internal_search";
    let response: Response;

    if (args.agentId) {
      // `quick` is the only value the agent stream schemas accept, and it is
      // required — so ignore whatever the caller passed rather than forwarding
      // a value the gateway would reject.
      const agentChatMode = "quick" as const;
      if (args.conversationId) {
        // Continue an existing agent conversation.
        const [result] = await agentsStreamMessage(client, {
          agentKey: args.agentId,
          conversationId: args.conversationId,
          body: {
            query: args.query,
            modelKey: args.modelKey,
            modelName: args.modelName,
            modelFriendlyName: args.modelFriendlyName,
            chatMode: agentChatMode,
          },
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        response = result.value;
      } else {
        // Start a new agent conversation.
        const [result] = await agentsStreamConversation(client, {
          agentKey: args.agentId,
          body: {
            query: args.query,
            filters: args.filters,
            modelKey: args.modelKey,
            modelName: args.modelName,
            modelFriendlyName: args.modelFriendlyName,
            chatMode: agentChatMode,
          },
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        response = result.value;
      }
    } else if (args.conversationId) {
      // Continue an existing (non-agent) conversation.
      const [result] = await conversationsStreamMessage(client, {
        conversationId: args.conversationId,
        body: {
          query: args.query,
          modelKey: args.modelKey,
          modelName: args.modelName,
          modelFriendlyName: args.modelFriendlyName,
          chatMode: plainChatMode,
        },
      }, { fetchOptions }).$inspect();
      if (!result.ok) return errorResult(result.error.message);
      response = result.value;
    } else {
      // Start a new (non-agent) conversation.
      const [result] = await conversationsStreamConversation(client, {
        query: args.query,
        filters: args.filters,
        modelKey: args.modelKey,
        modelName: args.modelName,
        modelFriendlyName: args.modelFriendlyName,
        chatMode: plainChatMode,
      }, { fetchOptions }).$inspect();
      if (!result.ok) return errorResult(result.error.message);
      response = result.value;
    }

    // The streaming funcs accept any HTTP status as a "successful request",
    // so explicitly reject non-2xx (auth, not-found, server errors) with a
    // clear message before we try to read the body as SSE.
    const httpErr = await httpErrorResult(response, "PipesHub chat request");
    if (httpErr) return httpErr;

    // Drain the AG-UI stream. `applyAGUIFrame` returns true only on a
    // genuinely terminal frame — a sub-agent's RUN_FINISHED carries no
    // `result` and must not end the loop.
    const state = newChatStreamState();
    try {
      for await (const frame of iterateSSE(response)) {
        if (applyAGUIFrame(state, frame)) break;
      }
    } catch (e: unknown) {
      return errorResult(`SSE stream failed: ${(e as Error).message}`);
    }

    if (state.error) return errorResult(state.error);

    if (state.conversation) {
      return jsonResult({
        ...trimConversation(state.conversation),
        recordsUsed: state.recordsUsed,
      });
    }

    // Stream ended without a terminal frame — unusual, but salvage what we
    // accumulated so the LLM has something to work with. `conversation_created`
    // arrives before any answer text, so a follow-up turn can still resume.
    const salvaged = salvagedText(state);
    if (salvaged) {
      return jsonResult({
        conversationId: state.conversationId,
        title: state.title,
        status: "Inprogress",
        answer: salvaged,
        confidence: null,
        citations: [],
        followUpQuestions: [],
        messageCount: 0,
        recordsUsed: state.recordsUsed,
        warning: "Stream ended without a terminal RUN_FINISHED; answer is the "
          + "accumulated TEXT_MESSAGE_CONTENT and citations are unavailable.",
      });
    }

    return errorResult("Stream ended without any usable frames.");
  },
};
