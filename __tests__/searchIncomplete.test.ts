import { beforeEach, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { forgetSearches } from "../src/mcp-server/tools/_searchResults.js";
import {
  NO_RESULTS_NOTE,
  SEARCH_AGAIN_NOTE,
  tool$pipeshubSearch,
} from "../src/mcp-server/tools/pipeshubSearch.js";

// A search the server could not run in full (its index ran out of time, part of
// it failed or hit a cap) can come back empty. The server says so in
// `searchIncomplete`; the agent must read that as "the search did not finish",
// not as "nothing matches".

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
    expect(notes).toContain(`${said} ${SEARCH_AGAIN_NOTE}`);
    expect(notes).toContain(NO_RESULTS_NOTE);
  });

  test("tells the agent to search again when records came back too", async () => {
    const said = "Part of this search could not run in full, so this search may have missed documents.";
    const record = { id: "r1", recordName: "Plan", webUrl: "https://x.test/r1", connectorName: "KB" };
    const core = client({
      searchResponse: {
        searchResults: [{ content: "plan", metadata: { recordId: "r1", recordName: "Plan", webUrl: "https://x.test/r1" } }],
        records: [record],
        searchIncomplete: said,
      },
    });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toContain(`${said} ${SEARCH_AGAIN_NOTE}`);
  });

  test("does not word a bare flag: it is also set for complete answers", async () => {
    const core = client({ searchResponse: { searchResults: [], records: [], searchDegraded: true } });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toEqual([NO_RESULTS_NOTE]);
  });

  test("adds nothing to a search that ran in full", async () => {
    const core = client({ searchResponse: { searchResults: [], records: [] } });
    const notes = notesOf(await tool$pipeshubSearch.tool(core, { query: "q" } as never, ctx()) as never);
    expect(notes).toEqual([NO_RESULTS_NOTE]);
  });
});
