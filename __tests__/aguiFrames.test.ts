import { describe, expect, test } from "bun:test";
import {
  applyAGUIFrame,
  newChatStreamState,
  salvagedText,
} from "../src/mcp-server/tools/_agui.js";
import type { SSEFrame } from "../src/mcp-server/tools/_helpers.js";

const frame = (event: string, data: unknown, raw = ""): SSEFrame =>
  ({ event, data, raw }) as SSEFrame;

describe("applyAGUIFrame — terminal detection", () => {
  // Regression: the gateway swallows the AI backend's root RUN_FINISHED and
  // re-emits an enriched one carrying `result`. Sub-agent RUN_FINISHED frames
  // are forwarded verbatim without it, so matching on the event name alone
  // ends the stream at the first sub-agent to finish.
  test("a nested RUN_FINISHED with no result does not terminate", () => {
    const state = newChatStreamState();
    expect(applyAGUIFrame(state, frame("RUN_FINISHED", { threadId: "t1" })))
      .toBe(false);
    expect(state.conversation).toBeNull();
  });

  test("the gateway's RUN_FINISHED with result terminates", () => {
    const state = newChatStreamState();
    const conversation = { _id: "c1", messages: [] };
    expect(
      applyAGUIFrame(
        state,
        frame("RUN_FINISHED", { result: { conversation, recordsUsed: 4 } }),
      ),
    ).toBe(true);
    expect(state.conversation).toEqual(conversation);
    expect(state.recordsUsed).toBe(4);
  });

  test("recordsUsed falls back to result.meta", () => {
    const state = newChatStreamState();
    applyAGUIFrame(
      state,
      frame("RUN_FINISHED", { result: { conversation: {}, meta: { recordsUsed: 7 } } }),
    );
    expect(state.recordsUsed).toBe(7);
  });

  test("RUN_ERROR terminates and surfaces the message", () => {
    const state = newChatStreamState();
    expect(applyAGUIFrame(state, frame("RUN_ERROR", { message: "boom" })))
      .toBe(true);
    expect(state.error).toBe("boom");
  });

  test("lifecycle frames are ignored", () => {
    const state = newChatStreamState();
    for (const e of ["RUN_STARTED", "TOOL_CALL_START", "HEARTBEAT", "STEP_STARTED"]) {
      expect(applyAGUIFrame(state, frame(e, {}))).toBe(false);
    }
    expect(state.conversation).toBeNull();
    expect(state.error).toBeNull();
  });
});

describe("applyAGUIFrame — text accumulation", () => {
  // Regression: universal `agent` mode forwards child-run text alongside the
  // root answer, so a single buffer would splice sub-agent output into the
  // middle of the reply.
  test("interleaved messageIds do not splice", () => {
    const state = newChatStreamState();
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "root", delta: "Hello ", parentRunId: null }));
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "child", delta: "SUBAGENT", parentRunId: "r1" }));
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "root", delta: "world", parentRunId: null }));

    expect(state.text.get("root")).toBe("Hello world");
    expect(state.text.get("child")).toBe("SUBAGENT");
    expect(state.rootMessageIds.has("root")).toBe(true);
    expect(state.rootMessageIds.has("child")).toBe(false);
  });

  test("salvagedText prefers the root run", () => {
    const state = newChatStreamState();
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "root", delta: "short", parentRunId: null }));
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "child", delta: "a much longer sub-agent answer", parentRunId: "r1" }));

    expect(salvagedText(state)).toBe("short");
  });

  test("salvagedText falls back to any run when no root frames were seen", () => {
    const state = newChatStreamState();
    applyAGUIFrame(state, frame("TEXT_MESSAGE_CONTENT", { messageId: "child", delta: "only child text", parentRunId: "r1" }));

    expect(salvagedText(state)).toBe("only child text");
  });

  test("salvagedText is null on an empty stream", () => {
    expect(salvagedText(newChatStreamState())).toBeNull();
  });
});

describe("applyAGUIFrame — conversation_created", () => {
  test("captures conversationId and title before any answer text", () => {
    const state = newChatStreamState();
    expect(
      applyAGUIFrame(
        state,
        frame("CUSTOM", {
          name: "conversation_created",
          value: { conversationId: "c9", title: "Onboarding" },
        }),
      ),
    ).toBe(false);
    expect(state.conversationId).toBe("c9");
    expect(state.title).toBe("Onboarding");
  });

  test("other CUSTOM frames are no-ops", () => {
    const state = newChatStreamState();
    applyAGUIFrame(state, frame("CUSTOM", { name: "something_else", value: { conversationId: "nope" } }));
    expect(state.conversationId).toBeNull();
  });
});
