import { describe, expect, test } from "bun:test";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

describe("pipeshub_chat arguments", () => {
  // The mode is fixed by the tool, so the client has nothing to choose.
  test("chatMode is not an argument", () => {
    expect("chatMode" in tool$pipeshubChat.args).toBe(false);
  });
});
