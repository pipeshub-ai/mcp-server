import { describe, expect, test } from "bun:test";
import { renderedResult } from "../src/mcp-server/tools/pipeshubGetRecordContent.js";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const textOf = (r: { content?: Array<{ type: string; text?: string }> }) =>
  r.content?.[0]?.text ?? "";

describe("renderedResult", () => {
  // The `Next:` line is the whole point: the backend renders literal call
  // syntax into `text`, so the LLM must receive that string rather than JSON.
  test("hands back the rendered text when present", async () => {
    const rendered = [
      "Path: Jira (app, id=a1) > Payments (recordGroup, id=b2)",
      "",
      "Children 1-2 of 2:",
      "- [record/TICKET] Fix payment retry | record_id=c3 | has children",
      "",
      'Next: pipeshub_get_record_content(mode="navigate", nodeId="c3") to open a child',
    ].join("\n");

    const out = await renderedResult(json({ text: rendered, rows: [], breadcrumbs: [] }));
    expect(textOf(out)).toBe(rendered);
    expect(textOf(out)).toContain("pipeshub_get_record_content(mode=");
  });

  test("a lookup miss surfaces as text, not an error", async () => {
    const rendered = "Not found (or no access): PA-9999  [searched: JIRA, CONFLUENCE]";
    const out = await renderedResult(
      json({ text: rendered, matches: [], ambiguous: false, not_found_identifiers: ["PA-9999"] }),
    );
    expect(textOf(out)).toBe(rendered);
  });

  // Falling back rather than returning an empty text block keeps the payload
  // usable if the backend ever stops rendering `text`.
  test("falls back to JSON when text is missing, empty, or blank", async () => {
    for (const body of [{ rows: [] }, { text: "", rows: [] }, { text: "   ", rows: [] }]) {
      const out = await renderedResult(json(body));
      expect(JSON.parse(textOf(out))).toEqual(body);
    }
  });
});
