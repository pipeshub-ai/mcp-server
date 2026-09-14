import { describe, expect, test } from "bun:test";
import {
  searchFilters,
  toSource,
} from "../src/mcp-server/tools/_helpers.js";

const COLL = "11111111-1111-4111-8111-111111111111";
const COLL_2 = "22222222-2222-4222-8222-222222222222";
const CONN = "33333333-3333-4333-8333-333333333333";
const CONN_2 = "44444444-4444-4444-8444-444444444444";

describe("toSource", () => {
  test("a KB root node is a collection", () => {
    expect(toSource({ id: COLL, name: "HR", connector: "KB", hasChildren: true }))
      .toEqual({ id: COLL, name: "HR", kind: "knowledgeBase", connector: "KB", hasChildren: true });
  });

  test("any other root node is a connector", () => {
    expect(toSource({ id: CONN, name: "Jira", connector: "JIRA", hasChildren: false }).kind)
      .toBe("connector");
  });
});

// Ids are sent where the caller put them. Connector ids belong in `apps`,
// collection ids in `kb`; the tool does not look ids up or move them.
describe("searchFilters", () => {
  test("nothing scoped sends no filters, which searches everything", () => {
    expect(searchFilters(undefined, undefined)).toBeUndefined();
    expect(searchFilters([], [])).toBeUndefined();
  });

  test("connectors only", () => {
    expect(searchFilters([CONN], undefined)).toEqual({ apps: [CONN], kb: [] });
  });

  test("collections only", () => {
    expect(searchFilters(undefined, [COLL])).toEqual({ apps: [], kb: [COLL] });
  });

  test("both, in the caller's order", () => {
    expect(searchFilters([CONN, CONN_2], [COLL, COLL_2]))
      .toEqual({ apps: [CONN, CONN_2], kb: [COLL, COLL_2] });
  });

  test("an id is never moved between apps and kb", () => {
    expect(searchFilters([COLL], [CONN])).toEqual({ apps: [COLL], kb: [CONN] });
  });

  test("duplicate ids collapse", () => {
    expect(searchFilters([CONN, CONN], [COLL, COLL]))
      .toEqual({ apps: [CONN], kb: [COLL] });
  });
});
