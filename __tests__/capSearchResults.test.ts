import { describe, expect, test } from "bun:test";
import { capSearchResults } from "../src/mcp-server/tools/_helpers.js";

const hit = (recordId: string, score: number) => ({ recordId, score });
const rec = (recordId: string) => ({ recordId });

describe("capSearchResults", () => {
  test("under the limit, everything passes through", () => {
    const hits = [hit("a", 0.9), hit("b", 0.8)];
    const records = [rec("a"), rec("b")];
    expect(capSearchResults(hits, records, 10))
      .toEqual({ hits, records, hitsBeforeLimit: 2, truncated: false });
  });

  test("exactly at the limit is not truncated", () => {
    const hits = [hit("a", 0.9), hit("b", 0.8)];
    expect(capSearchResults(hits, [rec("a"), rec("b")], 2).truncated).toBe(false);
  });

  // Regression: the backend applies `limit` to each expanded query, so
  // `limit: 1` returned 14 hits.
  test("over the limit, keeps the top hits and only their records", () => {
    const hits = [hit("a", 0.9), hit("a", 0.85), hit("b", 0.8), hit("c", 0.7)];
    const records = [rec("a"), rec("b"), rec("c")];
    expect(capSearchResults(hits, records, 2)).toEqual({
      hits: [hit("a", 0.9), hit("a", 0.85)],
      records: [rec("a")],
      hitsBeforeLimit: 4,
      truncated: true,
    });
  });

  test("records with no hits pass through when nothing was cut", () => {
    const records = [rec("a")];
    expect(capSearchResults([], records, 10))
      .toEqual({ hits: [], records, hitsBeforeLimit: 0, truncated: false });
  });
});
