import { beforeEach, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { forgetSearches } from "../src/mcp-server/tools/_searchResults.js";
import {
  NO_RESULTS_NOTE,
  SEARCH_DEGRADED_NOTE,
  tool$pipeshubSearch,
} from "../src/mcp-server/tools/pipeshubSearch.js";

// A search the server stopped short (its index ran out of time) can come back
// empty. The agent must read that as "the search did not finish", not as
// "nothing matches".

function client(body: unknown) {
  const fetcher = async () => Response.json(body);
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({ fetcher }),
  });
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const notesOf = (r: { content: Array<{ text?: string }> }): string[] =>
  JSON.parse(r.content.map((c) => c.text ?? "").join("")).notes ?? [];

beforeEach(() => forgetSearches());

describe("pipeshub_search on a search that did not run in full", () => {
  test("passes on the server's own words", async () => {
    const said = "The search index could not finish this search in time, so this search may have missed documents.";
    const core = client({
      searchResponse: { searchResults: [], records: [], searchIncomplete: said, searchDegraded: true },
    });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toContain(said);
    expect(notes).toContain(NO_RESULTS_NOTE);
  });

  test("words a bare flag itself", async () => {
    const core = client({ searchResponse: { searchResults: [], records: [], searchDegraded: true } });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toContain(SEARCH_DEGRADED_NOTE);
  });

  test("adds nothing to a search that ran in full", async () => {
    const core = client({ searchResponse: { searchResults: [], records: [] } });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toEqual([NO_RESULTS_NOTE]);
  });
});
