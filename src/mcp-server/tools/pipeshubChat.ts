// `POST /conversations/stream` (and
// `POST /conversations/{conversationId}/messages/stream` for follow-ups),
// accumulate the frames server-side, and hand the LLM a single trimmed
// `CallToolResult` once the stream emits its terminal `complete` (or
// `error`) frame.
//
// The backend has shipped TWO stream vocabularies. We handle both: an
// instance may be running either generation, and the tool must not break
// against the one it wasn't written for. That is exactly what happened
// once already — this file documented only the legacy set, the backend
// moved to AG-UI, and every frame fell through to `default`, leaving the
// drain loop to report "Stream ended without any usable frames" on runs
// that had in fact completed successfully with citations.
//
// Legacy vocabulary:
//   - connected        — handshake; ignored
//   - status           — { status: "started" | "searching" | ... }; ignored
//   - answer_chunk     — { content, accumulated, ... }; latest `accumulated`
//                        kept as a fallback
//   - tool_call        — observability breadcrumb; ignored
//   - tool_success     — paired with tool_call; same treatment
//   - complete         — terminal; `{ conversation, meta }`
//   - error            — terminal; surfaced as a tool error
//
// AG-UI vocabulary:
//   - RUN_STARTED         — handshake; ignored
//   - CUSTOM              — e.g. conversation_created; ignored
//   - HEARTBEAT           — keepalive; ignored
//   - STATE_DELTA         — incremental run state; ignored
//   - STATE_SNAPSHOT      — run state; the one with `snapshot.final === true`
//                           carries the resolved answer, citations and
//                           confidence, and is our preferred fallback
//   - TEXT_MESSAGE_START  — ignored
//   - TEXT_MESSAGE_CONTENT— { delta }; incremental answer text. WARNING: the
//                           deltas contain unresolved citation placeholders
//                           (`[source](ref4)`), resolved only in the terminal
//                           frame — never treat accumulated deltas as cited
//   - TEXT_MESSAGE_END    — ignored
//   - RUN_FINISHED        — terminal; `{ result: { conversation, meta } }`
//                           (one level deeper than legacy `complete`)
//   - RUN_ERROR           — terminal; surfaced as a tool error

import * as z from "zod";
import { conversationsStreamConversation } from "../../funcs/conversationsStreamConversation.js";
import { conversationsStreamMessage } from "../../funcs/conversationsStreamMessage.js";
import { agentsStreamConversation } from "../../funcs/agentsStreamConversation.js";
import { agentsStreamMessage } from "../../funcs/agentsStreamMessage.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  httpErrorResult,
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
    "auto",
    "quick",
    "verification",
    "deep",
  ]).optional().describe(
    "Response strategy. The valid values depend on whether `agentId` is set:\n"
      + "- WITHOUT `agentId` (plain chat): `internal_search` — answer from the "
      + "org's indexed knowledge (default) — or `web_search` — answer from the "
      + "live web.\n"
      + "- WITH `agentId` (agent chat): `auto` (let the agent decide; default), "
      + "`quick`, `verification`, or `deep`.",
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
Answers come from a few retrieved passages, not whole documents — for
any task needing a document's full content, use
\`pipeshub_get_record_content\` instead.

**Web search** (\`chatMode: "web_search"\`): Use when the user asks about
current events, public information, or anything unlikely to be in the org's
internal knowledge base. Pass \`chatMode: "web_search"\` and this tool will
search the public web instead.

**When to pick this over other tools:**
- "Summarize <doc>" / "key points of <doc>" / "what does <document> say
  about X?" → NOT this tool. Use \`pipeshub_search\` →
  \`pipeshub_get_record_content\`: answering for a specific document
  requires its full content, and chat only sees a few retrieved
  passages, never the whole document.
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

    if (args.agentId) {
      // Agent conversation. Agent chatMode vocabulary defaults to `auto`.
      const agentChatMode = args.chatMode ?? "auto";
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
          chatMode: args.chatMode ?? "internal_search",
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
        chatMode: args.chatMode ?? "internal_search",
      }, { fetchOptions }).$inspect();
      if (!result.ok) return errorResult(result.error.message);
      response = result.value;
    }

    // The streaming funcs accept any HTTP status as a "successful request",
    // so explicitly reject non-2xx (auth, not-found, server errors) with a
    // clear message before we try to read the body as SSE.
    const httpErr = await httpErrorResult(response, "PipesHub chat request");
    if (httpErr) return httpErr;

    // Drain the SSE stream. We only need the terminal `complete` (or
    // `error`) frame; everything else is observability and ignored.
    let finalConversation: any = null;
    let recordsUsed: number | undefined;
    let lastAccumulated: string | null = null;
    let errorMessage: string | null = null;
    let finalSnapshot: any = null;

    try {
      for await (const frame of iterateSSE(response)) {
        switch (frame.event) {
          // ---- Legacy vocabulary (backends before the AG-UI switch) ----
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

          // ---- AG-UI vocabulary ----
          // The terminal frame. Its payload nests one level deeper than the
          // legacy `complete` frame — `{ result: { conversation, meta } }`
          // rather than `{ conversation, meta }` — but the conversation
          // itself is the same shape, so `trimConversation` still applies.
          case "RUN_FINISHED": {
            const d = frame.data ?? {};
            const r = d.result ?? {};
            finalConversation = r.conversation ?? d.conversation ?? null;
            recordsUsed = r.recordsUsed ?? r.meta?.recordsUsed
              ?? d.recordsUsed ?? d.meta?.recordsUsed;
            break;
          }
          case "RUN_ERROR": {
            const d = frame.data ?? {};
            errorMessage = typeof d === "string"
              ? d
              : (d.message ?? d.error ?? frame.raw ?? "Stream error");
            break;
          }
          // Incremental answer text. Note these deltas carry UNRESOLVED
          // citation refs (`[source](ref4)`); only the terminal frame has
          // them resolved to real records. See the salvage branch below.
          case "TEXT_MESSAGE_CONTENT": {
            const d = frame.data ?? {};
            if (typeof d.delta === "string") {
              lastAccumulated = (lastAccumulated ?? "") + d.delta;
            } else if (typeof d.content === "string") {
              lastAccumulated = (lastAccumulated ?? "") + d.content;
            }
            break;
          }
          // The run emits a final STATE_SNAPSHOT carrying the resolved
          // answer, citations and confidence. Strictly better than the raw
          // deltas if the terminal frame is somehow missed.
          case "STATE_SNAPSHOT": {
            const s = (frame.data ?? {}).snapshot;
            if (s && s.final === true) finalSnapshot = s;
            break;
          }

          // Legacy status / tool_call / tool_success / connected and AG-UI
          // RUN_STARTED / STATE_DELTA / TEXT_MESSAGE_START / TEXT_MESSAGE_END
          // / HEARTBEAT / CUSTOM — observability only, ignored.
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

    // No terminal frame, but the run published a final snapshot. This still
    // carries resolved citations, so prefer it over the raw deltas.
    if (finalSnapshot && typeof finalSnapshot.answer === "string") {
      return jsonResult({
        conversationId: null,
        title: null,
        status: "Complete",
        answer: finalSnapshot.answer,
        confidence: finalSnapshot.confidence ?? null,
        citations: finalSnapshot.citations ?? [],
        followUpQuestions: [],
        messageCount: 0,
        recordsUsed,
        warning: "Stream ended without a terminal frame; answer and citations "
          + "were recovered from the run's final state snapshot.",
      });
    }

    // Last resort: the accumulated text deltas. Citations are genuinely
    // unavailable here — the deltas carry placeholder refs like
    // `[source](ref4)` that are only resolved in the terminal frame — so
    // `citations` stays empty and the caller must not treat this as sourced.
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
        warning: "Stream ended without a terminal frame; answer is the "
          + "accumulated text chunks. Any bracketed references in it are "
          + "UNRESOLVED placeholders, not citations — treat this answer as "
          + "uncited.",
      });
    }

    return errorResult("Stream ended without any usable frames.");
  },
};
