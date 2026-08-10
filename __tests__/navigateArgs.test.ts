import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { tool$pipeshubGetRecordContent } from "../src/mcp-server/tools/pipeshubGetRecordContent.js";

// The tool exposes its per-field arg schemas; reassemble them into an object
// schema to validate a whole `navigate`-mode payload the way an MCP host would.
const schema = z.object(tool$pipeshubGetRecordContent.args);

describe("pipeshub_get_record_content navigate args", () => {
  test("omitted page/limit/depth fall back to the defaults", () => {
    const parsed = schema.parse({ mode: "navigate" });
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(50);
    expect(parsed.depth).toBe(1);
  });

  // The endpoint's window is 50-200 and it 400s on anything outside it — note
  // the *minimum*: a smaller limit is rejected, not silently raised. Enforcing
  // it here turns a gateway 400 into a validation message.
  test("limit holds to the endpoint's 50-200 window", () => {
    expect(schema.safeParse({ mode: "navigate", limit: 50 }).success).toBe(true);
    expect(schema.safeParse({ mode: "navigate", limit: 200 }).success).toBe(true);
    expect(schema.safeParse({ mode: "navigate", limit: 49 }).success).toBe(false);
    expect(schema.safeParse({ mode: "navigate", limit: 201 }).success).toBe(false);
  });

  test("depth holds to the endpoint's 1-3 window", () => {
    expect(schema.safeParse({ mode: "navigate", depth: 3 }).success).toBe(true);
    expect(schema.safeParse({ mode: "navigate", depth: 0 }).success).toBe(false);
    expect(schema.safeParse({ mode: "navigate", depth: 4 }).success).toBe(false);
  });

  // `nameFilter` was dropped from the endpoint. z.object strips unknown keys
  // rather than rejecting them, so absence from the parsed output is the
  // meaningful guard — passing one must not silently reach the wire.
  test("nameFilter is gone from the host-visible schema", () => {
    const parsed = schema.parse({ mode: "navigate", nameFilter: "roadmap" });
    expect("nameFilter" in parsed).toBe(false);

    const json = z.toJSONSchema(schema) as { properties: Record<string, unknown> };
    expect(json.properties["nameFilter"]).toBeUndefined();
  });

  // Dates are passed through as strings: the endpoint owns the ISO 8601 rules
  // (timezone offset required on a full datetime, no inverted ranges), and
  // duplicating them here would only produce two sources of truth.
  test("nodeTypes and the date filters reach the parsed args", () => {
    const parsed = schema.parse({
      mode: "navigate",
      nodeTypes: ["record", "folder"],
      createdAfter: "2026-01-01",
      createdBefore: "2026-08-06",
      modifiedAfter: "2026-07-01T00:00:00+05:30",
      modifiedBefore: "2026-08-06",
    });
    expect(parsed.nodeTypes).toEqual(["record", "folder"]);
    expect(parsed.createdAfter).toBe("2026-01-01");
    expect(parsed.modifiedAfter).toBe("2026-07-01T00:00:00+05:30");
  });

  // nodeId is deliberately not UUID-constrained — the endpoint resolves a URL
  // or issue key to its record before navigating.
  test("nodeId accepts a URL and an issue key", () => {
    expect(
      schema.safeParse({
        mode: "navigate",
        nodeId: "https://acme.atlassian.net/browse/PA-1787",
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ mode: "navigate", nodeId: "PA-1787" }).success)
      .toBe(true);
  });
});

describe("pipeshub_get_record_content lookup args", () => {
  test("identifiers accepts a bare string or an array", () => {
    expect(schema.safeParse({ mode: "lookup", identifiers: "PA-1787" }).success)
      .toBe(true);
    expect(
      schema.safeParse({ mode: "lookup", identifiers: ["PA-1787", "PA-1788"] })
        .success,
    ).toBe(true);
  });

  // The endpoint truncates past 10 silently; reject client-side so the caller
  // learns the identifiers beyond the cap were never resolved.
  test("identifiers is capped at 10 and rejects an empty array", () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `PA-${i}`);
    expect(schema.safeParse({ mode: "lookup", identifiers: ids(10) }).success)
      .toBe(true);
    expect(schema.safeParse({ mode: "lookup", identifiers: ids(11) }).success)
      .toBe(false);
    expect(schema.safeParse({ mode: "lookup", identifiers: [] }).success)
      .toBe(false);
  });

  test("an over-long identifier is rejected", () => {
    expect(
      schema.safeParse({ mode: "lookup", identifiers: "x".repeat(2049) }).success,
    ).toBe(false);
  });
});
