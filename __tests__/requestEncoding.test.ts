import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { connectorGetRecordContent } from "../src/funcs/connectorGetRecordContent.js";
import { connectorNavigateKnowledgeGraph } from "../src/funcs/connectorNavigateKnowledgeGraph.js";
import { semanticSearchSearch } from "../src/funcs/semanticSearchSearch.js";
import { usersGetAllUsers } from "../src/funcs/usersGetAllUsers.js";
import { HTTPClient } from "../src/lib/http.js";

// What the curated tools put on the wire. Record ids and search text come
// from the model, so they must stay inside the path segment or query value
// they were meant for, and optional fields left unset must not be sent.

function capture() {
  const seen: Request[] = [];
  const sdk = new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({
      fetcher: async (input, init) => {
        seen.push(input instanceof Request ? input : new Request(input, init));
        return Response.json({});
      },
    }),
  });
  return { sdk, seen };
}

describe("path parameters", () => {
  test("a record id with reserved characters stays one percent-encoded path segment", async () => {
    const { sdk, seen } = capture();
    await connectorGetRecordContent(sdk, { recordId: "../users/x?y=1#z w" });
    const url = new URL(seen[0]?.url ?? "");
    expect(url.pathname).toBe("/api/v1/connectors/record/..%2Fusers%2Fx%3Fy%3D1%23z%20w/content");
    expect(url.search).toBe("");
  });
});

describe("query parameters", () => {
  test("search text is one encoded value, and unset options are not sent", async () => {
    const { sdk, seen } = capture();
    await usersGetAllUsers(sdk, { search: "Ann & Bob=1", page: 2 });
    const url = new URL(seen[0]?.url ?? "");
    expect(url.pathname).toBe("/api/v1/users");
    expect([...url.searchParams.entries()]).toEqual([
      // The schema's default limit is applied before encoding.
      ["limit", expect.any(String)],
      ["page", "2"],
      ["search", "Ann & Bob=1"],
    ]);
  });

  test("an array is sent the way the API documents it, one parameter per value", async () => {
    const { sdk, seen } = capture();
    await connectorNavigateKnowledgeGraph(sdk, { nodeId: "n1", nodeTypes: ["record", "folder"] });
    const url = new URL(seen[0]?.url ?? "");
    expect(url.searchParams.getAll("nodeTypes")).toEqual(["record", "folder"]);
    expect(url.searchParams.get("nodeId")).toBe("n1");
  });
});

describe("JSON bodies", () => {
  test("the search body is the validated request, with defaults applied", async () => {
    const { sdk, seen } = capture();
    await semanticSearchSearch(sdk, {
      query: "quarterly \"plan\" — draft",
      filters: { apps: ["a1"] },
    });
    const req = seen[0];
    expect(req?.method).toBe("POST");
    expect(req?.headers.get("content-type")).toBe("application/json");
    expect(await req?.json()).toEqual({
      query: "quarterly \"plan\" — draft",
      filters: { apps: ["a1"] },
      limit: 10,
    });
  });
});
