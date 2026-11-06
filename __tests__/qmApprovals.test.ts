import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { COMMAND_SCOPES } from "../src/cli/commands.js";

// Every CLI command that writes to the organization's PipesHub waits for a
// person in the QM bundle. add-web shipped once without a rule; this keeps the
// next write command from doing the same.
const WRITE_SCOPES = new Set(["kb:write", "kb:upload", "connector:write", "connector:sync"]);

describe("QM bundle approvals", () => {
  test("every write command requires approval", async () => {
    const bundle = JSON.parse(
      await readFile(join(import.meta.dir, "..", "qm", "sandbox", "tools", "pipeshub", "tool.json"), "utf8"),
    );
    const rules = JSON.stringify(bundle);
    const gated = new Set(
      [...rules.matchAll(/"command":\s*"([^"]+)",\s*"decision":\s*"require_approval"/g)].map((m) => m[1]),
    );
    const writes = Object.entries(COMMAND_SCOPES)
      .filter(([, scopes]) => scopes.some((s) => WRITE_SCOPES.has(s)))
      .map(([command]) => command);
    expect(writes).toContain("add-web");
    expect(writes.filter((c) => !gated.has(c))).toEqual([]);
  });
});
