// AG-UI frame folding for the chat stream.
//
// AG-UI is the only wire protocol the conversation and agent stream routes
// speak; the legacy `connected` / `answer_chunk` / `complete` / `error`
// vocabulary was removed with the new agent loop and is never emitted.
//
// Kept separate from `pipeshubChat.ts` so the fold is a pure function over
// frames and can be exercised without a live stream.

import type { SSEFrame } from "./_helpers.js";

export const AGUIEvent = {
  RUN_FINISHED: "RUN_FINISHED",
  RUN_ERROR: "RUN_ERROR",
  CUSTOM: "CUSTOM",
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
} as const;

export type ChatStreamState = {
  /** Persisted conversation from the terminal frame; null until then. */
  conversation: any | null;
  recordsUsed: number | undefined;
  error: string | null;
  /** From `CUSTOM{name:"conversation_created"}`, available before the answer. */
  conversationId: string | null;
  title: string | null;
  /**
   * Answer text accumulated per `messageId`. Universal `agent` mode forwards
   * child-run text alongside the root answer, so a single buffer would splice
   * sub-agent output into the middle of the reply.
   */
  text: Map<string, string>;
  /** messageIds seen on frames with no `parentRunId` — i.e. the root run. */
  rootMessageIds: Set<string>;
};

export function newChatStreamState(): ChatStreamState {
  return {
    conversation: null,
    recordsUsed: undefined,
    error: null,
    conversationId: null,
    title: null,
    text: new Map(),
    rootMessageIds: new Set(),
  };
}

/**
 * Fold one frame into `state`. Returns true when the frame is terminal and the
 * caller should stop draining the stream.
 */
/** The subset of AG-UI payload fields this fold reads. */
type FrameData = {
  result?: {
    conversation?: unknown;
    recordsUsed?: number;
    meta?: { recordsUsed?: number };
  };
  message?: string;
  error?: string;
  name?: string;
  value?: { conversationId?: string; title?: string };
  delta?: string;
  messageId?: string;
  parentRunId?: string | null;
};

export function applyAGUIFrame(
  state: ChatStreamState,
  frame: SSEFrame,
): boolean {
  const data = frame.data;
  const d: FrameData = data && typeof data === "object"
    ? data as FrameData
    : {};

  switch (frame.event) {
    case AGUIEvent.RUN_FINISHED: {
      // Only the gateway's own re-emitted frame carries `result` — it swallows
      // the AI backend's root RUN_FINISHED and re-sends an enriched one after
      // persisting. Sub-agent RUN_FINISHED frames are forwarded verbatim with
      // no `result`, so keying off the event name alone would end the stream
      // as soon as the first sub-agent finished.
      const result = d.result;
      if (!result || typeof result !== "object") return false;
      state.conversation = result.conversation ?? null;
      state.recordsUsed = result.recordsUsed ?? result.meta?.recordsUsed;
      return true;
    }

    case AGUIEvent.RUN_ERROR: {
      state.error = (typeof data === "string" ? data : null)
        ?? d.message ?? d.error ?? frame.raw ?? "Stream error";
      return true;
    }

    case AGUIEvent.CUSTOM: {
      if (d.name === "conversation_created") {
        const value = d.value ?? {};
        state.conversationId = value.conversationId ?? state.conversationId;
        state.title = value.title ?? state.title;
      }
      return false;
    }

    case AGUIEvent.TEXT_MESSAGE_CONTENT: {
      if (typeof d.delta !== "string" || d.delta.length === 0) return false;
      const id = typeof d.messageId === "string" ? d.messageId : "";
      state.text.set(id, (state.text.get(id) ?? "") + d.delta);
      if (d.parentRunId == null) state.rootMessageIds.add(id);
      return false;
    }

    // RUN_STARTED, STEP_*, TOOL_CALL_*, REASONING_*, STATE_*,
    // TEXT_MESSAGE_START/END, HEARTBEAT — lifecycle noise.
    default:
      return false;
  }
}

/**
 * Best-effort answer when the stream ended without a terminal frame.
 *
 * Prefers the longest root-run buffer; falls back to the longest buffer of any
 * run so a partial answer still reaches the caller.
 */
export function salvagedText(state: ChatStreamState): string | null {
  const pick = (ids: Iterable<string>): string | null => {
    let best: string | null = null;
    for (const id of ids) {
      const text = state.text.get(id);
      if (text && (best === null || text.length > best.length)) best = text;
    }
    return best;
  };
  return pick(state.rootMessageIds) ?? pick(state.text.keys());
}
