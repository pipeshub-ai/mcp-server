import { describe, expect, test } from "bun:test";
import { JsoncError, getAt, removeAt, setAt, toStrict } from "../src/cli/standalone/jsonc.js";

const ENTRY = { command: "npx", args: ["-y", "x"] };

describe("jsonc editor", () => {
  test("sets a nested member in an empty or missing file", () => {
    expect(JSON.parse(setAt("", ["a", "b"], ENTRY))).toEqual({ a: { b: ENTRY } });
    expect(setAt("", ["a", "b"], 1)).toBe('{\n  "a": {\n    "b": 1\n  }\n}\n');
  });

  test("keeps comments, order and trailing commas when adding to an existing object", () => {
    const before = '// header\n{\n  "theme": "dark", // keep\n  "servers": {\n    "other": { "command": "y" }, // mine\n  },\n}\n';
    const after = setAt(before, ["servers", "pipeshub"], ENTRY);
    expect(after.startsWith("// header\n")).toBe(true);
    expect(after).toContain('"theme": "dark", // keep');
    expect(after).toContain('"other": { "command": "y" }, // mine');
    expect(getAt(after, ["servers", "pipeshub"])).toEqual(ENTRY);
    expect(getAt(after, ["servers", "other"])).toEqual({ command: "y" });
  });

  test("adding to an object whose last member has no comma adds one on the right line", () => {
    const after = setAt('{\n  "a": 1 // note\n}\n', ["b"], 2);
    expect(after).toBe('{\n  "a": 1, // note\n  "b": 2\n}\n');
  });

  test("remove after add gives back the original text exactly", () => {
    for (const before of [
      '{\n  "a": 1\n}\n',
      '{\n  "a": 1,\n  "servers": {\n    "other": 2\n  }\n}\n',
      '{ // c\n\t"a": [1, 2]\n}\n',
    ]) {
      const added = setAt(before, ["servers", "pipeshub"], ENTRY);
      expect(getAt(added, ["servers", "pipeshub"])).toEqual(ENTRY);
      const removed = removeAt(added, ["servers", "pipeshub"]);
      expect(removed).toBe(before);
    }
  });

  test("a one-line file stays valid JSON through add and remove", () => {
    const added = setAt('{"a":1}', ["servers", "pipeshub"], ENTRY);
    expect(JSON.parse(removeAt(added, ["servers", "pipeshub"]))).toEqual({ a: 1 });
  });

  test("removing the only member removes the parents it leaves empty", () => {
    const added = setAt('{\n  "a": 1\n}\n', ["servers", "pipeshub"], ENTRY);
    expect(JSON.parse(removeAt(added, ["servers", "pipeshub"]))).toEqual({ a: 1 });
    expect(removeAt('{\n  "a": 1\n}\n', ["servers", "pipeshub"])).toBe('{\n  "a": 1\n}\n');
  });

  test("replaces an existing member in place", () => {
    const after = setAt('{"servers":{"pipeshub":{"command":"old"},"o":1}}', ["servers", "pipeshub"], ENTRY);
    expect(JSON.parse(after)).toEqual({ servers: { pipeshub: ENTRY, o: 1 } });
  });

  test("malformed input throws JsoncError", () => {
    for (const bad of ['{ "a": ', "[1]", '{"a":1} x', '{"a" 1}', "/* open", '{"a":"x}']) {
      expect(() => setAt(bad, ["b"], 1)).toThrow(JsoncError);
    }
  });

  test("toStrict keeps comment-like text inside strings", () => {
    expect(JSON.parse(toStrict('{"u": "http://x // y", /* c */ "v": [1,],}'))).toEqual({ u: "http://x // y", v: [1] });
  });
});

function jsonOf(t: string) {
  return JSON.parse(toStrict(t));
}
