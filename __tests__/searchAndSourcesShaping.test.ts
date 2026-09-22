import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubSearch } from "../src/mcp-server/tools/pipeshubSearch.js";
import { tool$pipeshubSources } from "../src/mcp-server/tools/pipeshubSources.js";
import { trimSearchHit } from "../src/mcp-server/tools/_helpers.js";

// These two tools decide what a language model is shown. Everything they leave
// out, the model cannot reason about; everything they get wrong, it will repeat
// as fact. A search hit without its `recordId` cannot be opened, and a source
// list that loses the distinction between a connector and a collection sends
// every later search to the wrong place.

const REC = "rec-1";

/** A client that answers every request with `body`, and records what it asked. */
function client(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    urls.push((input as Request).url);
    return Response.json(body, { status });
  };
  return {
    urls,
    core: new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    }),
  };
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");
const jsonOf = (r: { content: Array<{ text?: string }> }) => JSON.parse(textOf(r));

describe("trimSearchHit", () => {
  const hit = {
    score: 0.91,
    content: "the passage that matched",
    metadata: {
      recordId: REC,
      recordName: "Runbook",
      mimeType: "text/markdown",
      extension: "md",
      connector: "KB",
      webUrl: "https://pipeshub.test/record/rec-1",
      pageNum: 4,
      blockText: "fallback text",
    },
  };

  test("keeps everything the model needs to cite and open a result", () => {
    expect(trimSearchHit(hit)).toEqual({
      recordId: REC,
      recordName: "Runbook",
      score: 0.91,
      snippet: "the passage that matched",
      mimeType: "text/markdown",
      extension: "md",
      connector: "KB",
      webUrl: "https://pipeshub.test/record/rec-1",
      pageNum: 4,
    });
  });

  test("a long passage is cut to a snippet rather than sent whole", () => {
    // Search returns many hits at once. Sending each one in full is how a
    // single search fills the model's context and leaves no room for an answer.
    const long = { ...hit, content: "x".repeat(1000) };
    expect(trimSearchHit(long).snippet).toHaveLength(280);
  });

  test("falls back to the block text when there is no passage", () => {
    const { content, ...rest } = hit;
    expect(trimSearchHit(rest).snippet).toBe("fallback text");
  });

  test("a hit with no metadata at all does not throw", () => {
    // The shape comes from the server, so it has to be treated as untrusted.
    expect(() => trimSearchHit({})).not.toThrow();
    expect(trimSearchHit({}).recordId).toBeUndefined();
    expect(() => trimSearchHit(null)).not.toThrow();
  });
});

describe("pipeshub_search", () => {
  const payload = {
    searchId: "s-1",
    searchResponse: {
      searchResults: [
        { score: 0.9, content: "first", metadata: { recordId: REC, recordName: "A" } },
        { score: 0.4, content: "second", metadata: { recordId: "rec-2", recordName: "B" } },
      ],
      records: [
        { _key: REC, recordName: "A", connectorName: "KB", mimeType: "text/plain", webUrl: "u1" },
      ],
    },
  };

  test("returns the hits and the records they came from", async () => {
    const { core } = client(payload);

    const out = await tool$pipeshubSearch.tool(core, { query: "runbook" } as never, ctx());

    const body = jsonOf(out);
    expect(body.searchId).toBe("s-1");
    expect(body.hits.map((h: { recordId: string }) => h.recordId)).toEqual([REC, "rec-2"]);
    expect(body.uniqueRecords).toEqual([{
      recordId: REC, recordName: "A", connector: "KB", mimeType: "text/plain", webUrl: "u1",
    }]);
  });

  test("a response with neither hits nor records is empty, not broken", async () => {
    // "Nothing matched" is an ordinary answer and must not read as a failure.
    const { core } = client({ searchId: "s-2", searchResponse: {} });

    const out = await tool$pipeshubSearch.tool(core, { query: "nothing" } as never, ctx());

    expect(out.isError).toBeUndefined();
    expect(jsonOf(out)).toMatchObject({ searchId: "s-2", hits: [], uniqueRecords: [] });
  });

  test("a missing searchResponse does not throw", async () => {
    const { core } = client({ searchId: "s-3" });

    const out = await tool$pipeshubSearch.tool(core, { query: "x" } as never, ctx());

    expect(jsonOf(out).hits).toEqual([]);
  });

  test("a failed search says so instead of returning no results", async () => {
    // An empty hit list is a valid answer, so a failure that looks like one
    // tells the model the organisation has nothing on the subject.
    const { core } = client({ message: "search is down" }, 503);

    const out = await tool$pipeshubSearch.tool(core, { query: "x" } as never, ctx());

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("503");
  });

  test("notes are only included when there is something to say", async () => {
    const { core } = client(payload);

    const out = await tool$pipeshubSearch.tool(core, { query: "x" } as never, ctx());

    expect("notes" in jsonOf(out)).toBe(false);
  });
});

describe("pipeshub_sources", () => {
  const models = {
    models: [
      {
        modelKey: "k1", modelName: "GPT", provider: "openai",
        isDefault: true, isMultimodal: false, isReasoning: true,
        apiKey: "sk-secret", endpoint: "https://internal",
      },
    ],
  };

  test("a model is trimmed to what the model needs, and no more", async () => {
    // The listing carries provider credentials. Passing the whole object
    // through would hand an API key to the language model, and from there to
    // whatever it is talking to.
    const { core } = client(models);

    const out = await tool$pipeshubSources.tool(
      core,
      { include: ["llmModels"] } as never,
      ctx(),
    );

    const body = jsonOf(out);
    expect(body.llmModels).toEqual([{
      modelKey: "k1", modelName: "GPT", provider: "openai",
      isDefault: true, isMultimodal: false, isReasoning: true,
    }]);
    expect(textOf(out)).not.toContain("sk-secret");
    expect(textOf(out)).not.toContain("internal");
  });

  test("asking for one kind does not fetch the others", async () => {
    const { core, urls } = client(models);

    await tool$pipeshubSources.tool(core, { include: ["llmModels"] } as never, ctx());

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("llm");
  });

  test("a listing with no models is an empty list, not a missing key", async () => {
    const { core } = client({});

    const out = await tool$pipeshubSources.tool(
      core,
      { include: ["embeddingModels"] } as never,
      ctx(),
    );

    expect(jsonOf(out).embeddingModels).toEqual([]);
  });

  test("a failed model listing names which listing failed", async () => {
    const { core } = client({ message: "nope" }, 500);

    const out = await tool$pipeshubSources.tool(
      core,
      { include: ["llmModels"] } as never,
      ctx(),
    );

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("llmModels");
  });
});
