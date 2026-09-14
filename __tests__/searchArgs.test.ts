import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";

const schema = z.object(tool$pipeshubSearch.args);

describe("pipeshub_search args", () => {
  test("only query is required", () => {
    expect(schema.safeParse({ query: "leave policy" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  // Collections and connectors are scoped through different lists; the tool
  // has to accept both so a caller can put each id where the backend reads it.
  test("apps and kb are both accepted", () => {
    expect(schema.safeParse({ query: "q", apps: ["a"], kb: ["b"] }).success)
      .toBe(true);
  });

  test("limit is a whole number from 1 to 100", () => {
    for (const limit of [0, 101, 1.5]) {
      expect(schema.safeParse({ query: "q", limit }).success).toBe(false);
    }
    for (const limit of [1, 100]) {
      expect(schema.safeParse({ query: "q", limit }).success).toBe(true);
    }
  });
});
