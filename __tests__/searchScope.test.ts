import { describe, expect, test } from "bun:test";
import {
  routeSourceScope,
  searchFilters,
  sourceScopeNotes,
  toSource,
} from "../src/mcp-server/tools/_helpers.js";

const COLL = "11111111-1111-4111-8111-111111111111";
const COLL_2 = "22222222-2222-4222-8222-222222222222";
const CONN = "33333333-3333-4333-8333-333333333333";
const CONN_2 = "44444444-4444-4444-8444-444444444444";
const UNKNOWN = "55555555-5555-4555-8555-555555555555";
const kinds = new Map<string, "knowledgeBase" | "connector">([
  [COLL, "knowledgeBase"],
  [COLL_2, "knowledgeBase"],
  [CONN, "connector"],
  [CONN_2, "connector"],
]);

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

// The backend drops a collection id from `apps` and a connector id from `kb`,
// so each id is sent in the list its kind belongs to, whichever list the
// caller used.
describe("routeSourceScope", () => {
  test("a collection id in apps moves to kb", () => {
    expect(routeSourceScope([COLL], undefined, kinds))
      .toEqual({ apps: [], kb: [COLL], movedToKb: [COLL], movedToApps: [] });
  });

  test("a connector id in kb moves to apps", () => {
    expect(routeSourceScope(undefined, [CONN], kinds))
      .toEqual({ apps: [CONN], kb: [], movedToKb: [], movedToApps: [CONN] });
  });

  test("both lists swapped end up right", () => {
    expect(routeSourceScope([COLL], [CONN], kinds))
      .toEqual({ apps: [CONN], kb: [COLL], movedToKb: [COLL], movedToApps: [CONN] });
  });

  test("ids already in the right list are untouched", () => {
    expect(routeSourceScope([CONN, CONN_2], [COLL, COLL_2], kinds))
      .toEqual({ apps: [CONN, CONN_2], kb: [COLL, COLL_2], movedToKb: [], movedToApps: [] });
  });

  test("connectors keep their order when collections are pulled out", () => {
    expect(routeSourceScope([CONN, COLL, CONN_2], [], kinds).apps)
      .toEqual([CONN, CONN_2]);
  });

  test("an id already in kb is not duplicated by the move", () => {
    expect(routeSourceScope([COLL], [COLL, COLL_2], kinds).kb)
      .toEqual([COLL, COLL_2]);
  });

  test("an id already in apps is not duplicated by the move", () => {
    expect(routeSourceScope([CONN], [CONN], kinds).apps).toEqual([CONN]);
  });

  test("ids missing from the listing stay where the caller put them", () => {
    expect(routeSourceScope([UNKNOWN], [UNKNOWN], kinds))
      .toEqual({ apps: [UNKNOWN], kb: [UNKNOWN], movedToKb: [], movedToApps: [] });
  });

  test("duplicate ids collapse", () => {
    expect(routeSourceScope([CONN, CONN], [COLL, COLL], kinds))
      .toEqual({ apps: [CONN], kb: [COLL], movedToKb: [], movedToApps: [] });
  });
});

describe("searchFilters", () => {
  test("nothing scoped sends no filters, which searches everything", () => {
    expect(searchFilters({ apps: [], kb: [] })).toBeUndefined();
  });

  test("connectors only", () => {
    expect(searchFilters({ apps: [CONN], kb: [] })).toEqual({ apps: [CONN], kb: [] });
  });

  test("collections only", () => {
    expect(searchFilters({ apps: [], kb: [COLL] })).toEqual({ apps: [], kb: [COLL] });
  });

  test("both", () => {
    expect(searchFilters({ apps: [CONN], kb: [COLL] })).toEqual({ apps: [CONN], kb: [COLL] });
  });
});

describe("sourceScopeNotes", () => {
  test("no action, no notes", () => {
    expect(sourceScopeNotes({ movedToKb: [], movedToApps: [] })).toEqual([]);
  });

  test("a move to kb names the ids and where they belong", () => {
    const [note] = sourceScopeNotes({ movedToKb: [COLL], movedToApps: [] });
    expect(note).toContain("Moved 1 collection id(s) from apps to kb");
    expect(note).toContain(COLL);
  });

  test("a move to apps names the ids and where they belong", () => {
    const [note] = sourceScopeNotes({ movedToKb: [], movedToApps: [CONN] });
    expect(note).toContain("Moved 1 connector id(s) from kb to apps");
    expect(note).toContain(CONN);
  });

  test("moves in both directions give one note each", () => {
    expect(sourceScopeNotes({ movedToKb: [COLL], movedToApps: [CONN] })).toHaveLength(2);
  });

  // The lookup failing does not fail the search, so the note must not blame
  // the credential the search itself just used successfully.
  test("a failed lookup gives the reason without an auth hint", () => {
    const [note] = sourceScopeNotes({ movedToKb: [], movedToApps: [], lookupError: "HTTP 403" });
    expect(note).toContain("HTTP 403");
    expect(note).toContain("collection ids are in kb");
    expect(note?.toLowerCase()).not.toContain("bearer");
  });

  test("an incomplete listing names the ids it could not check", () => {
    const [note] = sourceScopeNotes({ movedToKb: [], movedToApps: [], unlisted: [CONN] });
    expect(note).toContain("Source list was incomplete");
    expect(note).toContain(CONN);
  });
});
