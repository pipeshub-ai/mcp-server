import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { PIPESHUB_INSTRUCTIONS } from "../src/mcp-server/instructions.js";
import { tool$pipeshubAgents } from "../src/mcp-server/tools/pipeshubAgents.js";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";
import { tool$pipeshubDirectory } from "../src/mcp-server/tools/pipeshubDirectory.js";
import { tool$pipeshubDownloadRecord } from "../src/mcp-server/tools/pipeshubDownloadRecord.js";
import { tool$pipeshubGetRecordContent } from "../src/mcp-server/tools/pipeshubGetRecordContent.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";
import { tool$pipeshubSources } from "../src/mcp-server/tools/pipeshubSources.js";

const { tools } = createMCPServer({ logger: createConsoleLogger("error") });

const byName = new Map(tools.map((t: any) => [t.name, t.description as string]));
const names = new Set(byName.keys());

// `tools` carries only name and description, so arg text comes from the
// definitions. A test below keeps this list equal to the registered tools.
const definitions: any[] = [
  tool$pipeshubSources,
  tool$pipeshubChat,
  tool$pipeshubSearch,
  tool$pipeshubDownloadRecord,
  tool$pipeshubGetRecordContent,
  tool$pipeshubDirectory,
  tool$pipeshubAgents,
];

/** The JSON schema a host sees for a tool's args, which carries each `.describe()`. */
const argSchema = (name: string): any => {
  const def = definitions.find((d) => d.name === name);
  return def?.args
    ? z.toJSONSchema(z.object(def.args), { unrepresentable: "any" })
    : {};
};

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

  // Collection ids in `apps` are dropped by the backend. The description has
  // to name `kb` or the model keeps putting every id in `apps`.
  test("search names the kb scope for collections", () => {
    expect(byName.get("pipeshub_search")).toContain("`kb`");
  });

  // Chat retrieval drops collection ids from `apps` the same way. Its `kb` arg
  // once said "Legacy / unused", which sent every id to `apps`.
  test("chat names the kb scope for collections", () => {
    const filters = argSchema("pipeshub_chat").properties?.filters;
    expect(filters?.properties?.kb?.description).toContain("knowledgeBase");
    expect(filters?.properties?.apps?.description).toContain("`kb`");
  });

  test("the arg checks see every registered tool", () => {
    expect(definitions.map((d) => d.name).sort()).toEqual([...names].sort());
  });

  // The org-wide `knowledgeBase_<orgId>` hub app is deleted by the KB
  // migration and is not a UUID, so the gateway rejects it. Arg text counts
  // too: the chat `apps` arg carried it after every description was clean.
  test("no description, arg, or the instructions points at knowledgeBase_<orgId>", () => {
    const texts: Array<[string, string]> = [
      ...byName.entries(),
      ...definitions.map((d) =>
        [`${d.name} args`, JSON.stringify(argSchema(d.name))] as [string, string]
      ),
      ["instructions", PIPESHUB_INSTRUCTIONS],
    ];
    for (const [where, text] of texts) {
      expect(`${where}: ${text.includes("knowledgeBase_")}`).toBe(`${where}: false`);
    }
  });

  test("sources does not send modelKey to search, which has no such argument", () => {
    expect(byName.get("pipeshub_sources")).not.toMatch(/pipeshub_search`\s+as\s+`modelKey/);
  });

  // Download returns opaque bytes. If a rewrite drops the sibling, hosts
  // download a file to answer "what does this doc say?"
  test("download_record routes reading to get_record_content", () => {
    const desc = byName.get("pipeshub_download_record") ?? "";
    expect(desc).toContain("pipeshub_get_record_content");
    expect(desc).toContain('mode:"content"');
    expect(desc.toLowerCase()).toContain("summarize");
  });
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
