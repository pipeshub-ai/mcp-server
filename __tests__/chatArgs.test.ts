import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

const schema = z.object(tool$pipeshubChat.args);

describe("pipeshub_chat chatMode", () => {
  // Regression: the agent stream schemas moved to `chatMode: quick` (required,
  // sole value). The tool kept defaulting to `auto`, which typechecked all the
  // way to a 400 because the streaming funcs pass `body` through untyped.
  test("the retired agent vocabulary is rejected at the schema", () => {
    for (const mode of ["auto", "verification", "deep"]) {
      expect(schema.safeParse({ query: "hi", chatMode: mode }).success)
        .toBe(false);
    }
  });

  test("the live vocabulary is accepted", () => {
    for (const mode of ["internal_search", "web_search", "quick"]) {
      expect(schema.safeParse({ query: "hi", chatMode: mode }).success)
        .toBe(true);
    }
  });

  test("chatMode stays optional — the tool supplies the default per path", () => {
    expect(schema.safeParse({ query: "hi" }).success).toBe(true);
  });
});
