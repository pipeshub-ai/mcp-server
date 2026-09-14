import { describe, expect, test } from "bun:test";
import { assertScopeHonored } from "../src/cli/commands.js";
import { EXIT } from "../src/cli/config.js";

describe("assertScopeHonored", () => {
  // A server older than the `kb` argument drops it and searches everything.
  // Returning those hits for `--kb` would look like a scoped answer.
  test("a --kb search against an old server fails loudly", () => {
    let caught: any;
    try {
      assertScopeHonored({ hits: [] }, true);
    } catch (e) {
      caught = e;
    }
    expect(caught?.message).toContain("predates --kb");
    expect(caught?.code).toBe(EXIT.ERROR);
  });

  test("a --kb search against a current server passes", () => {
    expect(() => assertScopeHonored({ hits: [], truncated: false }, true)).not.toThrow();
  });

  test("a search without --kb never trips the guard", () => {
    expect(() => assertScopeHonored({ hits: [] }, false)).not.toThrow();
  });
});
