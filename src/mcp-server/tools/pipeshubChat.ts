// Curated PipesHub chat tool. Hand-written; replaces the two generated
// tools `pipeshub-chat` (create) and `pipeshub-chat-continue` (follow-up)
// with a single tool that branches on whether `conversationId` was given.
//
// Wire transport: SSE. The non-streaming `/conversations/create` endpoint
// is broken in production today, so we drive
// `POST /conversations/stream` (and
// `POST /conversations/{conversationId}/messages/stream` for follow-ups),
// accumulate the frames server-side, and hand the LLM a single trimmed
// `CallToolResult` once the stream emits its terminal `complete` (or
// `error`) frame.
//
// Frame types we know about (from live wire traces):
//   - connected        — handshake; ignored
//   - status           — { status: "started" | "searching" | "processing"
//                         | "checking_tools" | ... }; ignored (UI-only)
//   - answer_chunk     — { content, accumulated, ... }; we keep the latest
//                        `accumulated` as a fallback in case the stream
//                        ends without a `complete` frame
//   - tool_call        — model invoked an internal tool; we collect these
//                        as observability breadcrumbs but the LLM doesn't
//                        need them to answer
//   - tool_success     — paired with tool_call; same treatment
//   - complete         — terminal; payload is `{ conversation, meta }`,
//                        matching the non-stream response shape, so we
//                        feed it through `trimConversation` like before
//   - error            — terminal; surface to the LLM as a tool error

import * as z from "zod";
import { conversationsStreamConversation } from "../../funcs/conversationsStreamConversation.js";
import { conversationsStreamMessage } from "../../funcs/conversationsStreamMessage.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  iterateSSE,
  jsonResult,
  trimConversation,
} from "./_helpers.js";

const FiltersShape = z.object({
  apps: z.array(z.string()).optional().describe(
    "Source-scoping ids. Mix connector instance UUIDs with the synthetic "
      + "`knowledgeBase_<orgId>` id (use pipeshub_sources to discover them). "
      + "Empty / omitted means no app-side restriction.",
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
    "Model id to use (from `pipeshub_sources` `models[*].modelKey`). "
      + "Defaults to the org's default LLM.",
  ),
  modelName: z.string().optional(),
  modelFriendlyName: z.string().optional(),
  chatMode: z.enum(["web_search", "internal_search"]).optional().describe(
    "Controls retrieval source. "
      + "`internal_search` (default) — searches the org's indexed knowledge "
      + "bases (Drive, Confluence, Slack, Gmail, Jira, Box, etc.) and returns "
      + "citations. Use this for questions about internal docs, policies, or "
      + "company data. "
      + "`web_search` — searches the public web instead of internal sources. "
      + "Use only when the user explicitly asks about current events, public "
      + "information, or anything not expected to be in the org's KB. "
      + "Omit this field (or pass `internal_search`) for all normal queries.",
  ),
};

export const tool$pipeshubChat: ToolDefinition<typeof args> = {
  name: "pipeshub_chat",
  description:
    `**Primary chat tool — handles both internal knowledge queries and web search.**

**Internal search** (default, \`chatMode: "internal_search"\`): Use whenever
the user asks about their documents, files, knowledge base, company policies,
or anything that could plausibly be answered by content in their PipesHub-indexed
sources (Drive, Box, Confluence, Slack, Gmail, Jira, the org's KB, ...).
Grounds the answer in the user's actual data and returns citations.

**Web search** (\`chatMode: "web_search"\`): Use when the user asks about
current events, public information, or anything unlikely to be in the org's
internal knowledge base. Pass \`chatMode: "web_search"\` and this tool will
search the public web instead.

**When to pick this over other tools:**
- "What does <document> say about X?" → \`pipeshub_chat\` (internal_search)
- "Summarize <topic / doc>." → \`pipeshub_chat\` (internal_search)
- "What's our policy on Y?" → \`pipeshub_chat\` (internal_search)
- "What's in the news about Z?" → \`pipeshub_chat\` (web_search)
- "What is the latest version of <library>?" → \`pipeshub_chat\` (web_search)
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
    let response: Response;

    if (args.conversationId) {
      // Continue an existing conversation.
      const [result] = await conversationsStreamMessage(client, {
        conversationId: args.conversationId,
        body: {
          query: args.query,
          modelKey: args.modelKey,
          modelName: args.modelName,
          modelFriendlyName: args.modelFriendlyName,
          chatMode: args.chatMode,
        },
      }, { fetchOptions }).$inspect();
      if (!result.ok) return errorResult(result.error.message);
      response = result.value;
    } else {
      // Start a new conversation.
      const [result] = await conversationsStreamConversation(client, {
        query: args.query,
        filters: args.filters,
        modelKey: args.modelKey,
        modelName: args.modelName,
        modelFriendlyName: args.modelFriendlyName,
        chatMode: args.chatMode,
      }, { fetchOptions }).$inspect();
      if (!result.ok) return errorResult(result.error.message);
      response = result.value;
    }

    // Drain the SSE stream. We only need the terminal `complete` (or
    // `error`) frame; everything else is observability and ignored.
    let finalConversation: any = null;
    let recordsUsed: number | undefined;
    let lastAccumulated: string | null = null;
    let errorMessage: string | null = null;

    try {
      for await (const frame of iterateSSE(response)) {
        switch (frame.event) {
          case "complete": {
            const d = frame.data ?? {};
            finalConversation = d.conversation ?? null;
            recordsUsed = d.recordsUsed ?? d.meta?.recordsUsed;
            break;
          }
          case "error": {
            const d = frame.data ?? {};
            errorMessage = typeof d === "string"
              ? d
              : (d.error ?? d.message ?? frame.raw ?? "Stream error");
            break;
          }
          case "answer_chunk": {
            const d = frame.data ?? {};
            if (typeof d.accumulated === "string") {
              lastAccumulated = d.accumulated;
            } else if (typeof d.content === "string") {
              lastAccumulated = (lastAccumulated ?? "") + d.content;
            }
            break;
          }
          // status / tool_call / tool_success / connected — ignored.
          default:
            break;
        }
        if (finalConversation || errorMessage) break;
      }
    } catch (e: unknown) {
      return errorResult(`SSE stream failed: ${(e as Error).message}`);
    }

    if (errorMessage) return errorResult(errorMessage);

    if (finalConversation) {
      return jsonResult({
        ...trimConversation(finalConversation),
        recordsUsed,
      });
    }

    // Stream ended without a terminal frame — unusual, but salvage what
    // we accumulated so the LLM has something to work with.
    if (lastAccumulated) {
      return jsonResult({
        conversationId: null,
        title: null,
        status: "Inprogress",
        answer: lastAccumulated,
        confidence: null,
        citations: [],
        followUpQuestions: [],
        messageCount: 0,
        recordsUsed,
        warning: "Stream ended without a `complete` frame; answer is "
          + "the last accumulated chunk and citations are unavailable.",
      });
    }

    return errorResult("Stream ended without any usable frames.");
  },
};
