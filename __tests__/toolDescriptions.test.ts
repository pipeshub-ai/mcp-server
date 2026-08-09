import { describe, expect, test } from "bun:test";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { PIPESHUB_INSTRUCTIONS } from "../src/mcp-server/instructions.js";

const { tools } = createMCPServer({ logger: createConsoleLogger("error") });

const byName = new Map(tools.map((t: any) => [t.name, t.description as string]));
const names = new Set(byName.keys());

describe("tool descriptions", () => {
  // navigate and lookup have no tool name of their own to be selected on, so
  // the mode literals are the only handle the model has. If a rewrite drops
  // one, the mode becomes unreachable in practice.
  test("all three record modes are named in the record tool", () => {
    const desc = byName.get("pipeshub_get_record_content") ?? "";
    for (const mode of ['mode:"content"', 'mode:"navigate"', 'mode:"lookup"']) {
      expect(desc).toContain(mode);
    }
  });

  // Compensating for the tool name saying "content": other tools have to push
  // structural questions into navigate mode.
  test("search and chat both route structural questions to navigate", () => {
    for (const tool of ["pipeshub_search", "pipeshub_chat"]) {
      expect(byName.get(tool)).toContain('mode:"navigate"');
    }
  });

  // `POST /search` renders no caveat of its own — the "ranked sample" note the
  // agent toolset emits never reaches this path. If a rewrite drops this, the
  // model counts hits to answer "how many" and is silently wrong.
  test("search declares that its result set is incomplete", () => {
    expect(byName.get("pipeshub_search")).toContain("ranked sample");
  });

  // The descriptions form a mutually-referential routing graph. A rename or a
  // tool split leaves dangling pointers the model will try to call.
  test("every tool named in a description or in the instructions exists", () => {
    const sources: Array<[string, string]> = [
      ...tools.map((t: any) => [t.name, t.description as string] as [string, string]),
      ["instructions", PIPESHUB_INSTRUCTIONS],
    ];
    for (const [where, text] of sources) {
      for (const referenced of text.match(/pipeshub_[a-z_]+/g) ?? []) {
        expect(`${where} → ${referenced}`)
          .toBe(`${where} → ${names.has(referenced) ? referenced : "UNKNOWN TOOL"}`);
      }
    }
  });
});

describe("description budget", () => {
  // Every byte here ships to the host on every session and competes with the
  // host's own tools. These ceilings are deliberately close to current size —
  // raising one should be a decision, not a side effect.
  //
  // Raised 2026-08-04, deliberately. Trimming descriptions to fit the previous
  // ceilings cost the concrete routing vocabulary — "epic / story / page /
  // file", "project / space / drive", the "how many / all / every" cases — and
  // hosts measurably stopped selecting navigate, falling back to chat for
  // everything. Selection is lexical: those nouns are what match a user's
  // wording. Budget pressure must not come out of routing text again.
  // Raised again 2026-08-06, deliberately, to carry the routing the platform's
  // own agent loop uses. That loop puts cross-tool arbitration in the system
  // prompt rather than in schemas, so matching it meant a `## Knowledge
  // Sources` block in the instructions (+~1550) plus the "ranked sample"
  // caveat on search (+~400) and depth/pagination guidance on navigate (+~370).
  // Without those, hosts count search hits to answer "how many" and never
  // reach for navigate at all.
  const PER_TOOL_MAX = 4000;
  const TOTAL_MAX = 11200;
  const INSTRUCTIONS_MAX = 8000;

  test.each([...byName.entries()])("%s stays under the per-tool ceiling", (name, desc) => {
    expect({ name, chars: desc.length <= PER_TOOL_MAX })
      .toEqual({ name, chars: true });
  });

  test("the combined description budget holds", () => {
    const total = [...byName.values()].reduce((n, d) => n + d.length, 0);
    expect(total).toBeLessThanOrEqual(TOTAL_MAX);
  });

  test("the instructions block holds", () => {
    expect(PIPESHUB_INSTRUCTIONS.length).toBeLessThanOrEqual(INSTRUCTIONS_MAX);
  });
});
