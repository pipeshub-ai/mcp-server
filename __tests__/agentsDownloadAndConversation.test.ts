import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubAgents } from "../src/mcp-server/tools/pipeshubAgents.js";
import { tool$pipeshubDownloadRecord } from "../src/mcp-server/tools/pipeshubDownloadRecord.js";
import { trimAgent, trimConversation } from "../src/mcp-server/tools/_helpers.js";

// The three remaining hand-written shapers. Each decides what a model is given:
// which agents it can route to, what a downloaded document arrives as, and how
// much of a conversation comes back.

function client(body: BodyInit | object, status = 200, contentType?: string) {
  const fetcher = async () =>
    contentType
      ? new Response(body as BodyInit, { status, headers: { "content-type": contentType } })
      : Response.json(body, { status });
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({ fetcher }),
  });
}

const ctx = () => ({ signal: new AbortController().signal }) as never;
const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");
const jsonOf = (r: { content: Array<{ text?: string }> }) => JSON.parse(textOf(r));

describe("trimAgent", () => {
  const agent = {
    _key: "a-1",
    name: "Support",
    description: "answers support questions",
    systemPrompt: "be helpful",
    startMessage: "hello",
    tags: ["support"],
    webSearch: { enabled: true },
    isActive: true,
    toolsets: [{ name: "jira", tools: [{ fullName: "jira.search" }, { name: "jira.create" }] }],
    knowledge: [{ name: "Runbooks", type: "kb" }],
  };

  test("keeps what a model needs to choose and address an agent", () => {
    expect(trimAgent(agent as never)).toEqual({
      agentId: "a-1",
      name: "Support",
      description: "answers support questions",
      systemPrompt: "be helpful",
      startMessage: "hello",
      tags: ["support"],
      webSearch: true,
      isActive: true,
      toolsets: [{ name: "jira", tools: ["jira.search", "jira.create"] }],
      knowledge: [{ name: "Runbooks", type: "kb" }],
    });
  });

  test("webSearch is reported as a plain yes or no", () => {
    // The server sends a configuration object. Handing that to a model invites
    // it to reason about fields it cannot act on; the only useful fact is
    // whether the agent can reach the web.
    expect(trimAgent({ ...agent, webSearch: undefined } as never).webSearch).toBe(false);
    expect(trimAgent({ ...agent, webSearch: { enabled: false } } as never).webSearch).toBe(true);
  });

  test("a tool with neither name is dropped rather than listed as nothing", () => {
    const trimmed = trimAgent({
      ...agent,
      toolsets: [{ name: "jira", tools: [{ fullName: "jira.search" }, {}] }],
    } as never);
    expect(trimmed.toolsets[0]!.tools).toEqual(["jira.search"]);
  });

  test("optional text is null rather than missing", () => {
    // A model reading an absent key and a null one draws the same conclusion,
    // but only one of them survives being serialised and compared.
    const bare = trimAgent({ ...agent, description: undefined, systemPrompt: undefined } as never);
    expect(bare.description).toBeNull();
    expect(bare.systemPrompt).toBeNull();
  });
});

describe("pipeshub_agents", () => {
  test("lists the agents with the total", async () => {
    const core = client({
      agents: [{ _key: "a-1", name: "Support", tags: [], toolsets: [], knowledge: [] }],
      pagination: { hasNext: false, totalItems: 1 },
    });

    const out = await tool$pipeshubAgents.tool(core, {} as never, ctx());

    expect(jsonOf(out)).toMatchObject({ agents: [{ agentId: "a-1" }], total: 1 });
  });

  test("an organisation with no agents is an empty list, not an error", async () => {
    // The tool's own description says the list may be empty, so this has to be
    // an ordinary answer rather than something a model treats as a failure.
    const core = client({ agents: [], pagination: { hasNext: false } });

    const out = await tool$pipeshubAgents.tool(core, {} as never, ctx());

    expect(out.isError).toBeUndefined();
    expect(jsonOf(out).agents).toEqual([]);
  });

  test("a truncated listing says so", async () => {
    const core = client({
      agents: Array.from({ length: 200 }, (_, i) => ({
        _key: `a-${i}`, name: `A${i}`, tags: [], toolsets: [], knowledge: [],
      })),
      pagination: { hasNext: true },
    });

    const out = await tool$pipeshubAgents.tool(core, { } as never, ctx());

    expect(jsonOf(out).truncated).toBe(true);
  });

  test("a failed listing is reported, not shown as no agents", async () => {
    // "No agents configured" and "we could not ask" look identical to a model,
    // and it acts on the first by giving up on agents entirely.
    const core = client({ message: "nope" }, 500);

    const out = await tool$pipeshubAgents.tool(core, {} as never, ctx());

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("500");
  });
});

describe("pipeshub_download_record", () => {
  test("a text document arrives as readable text", async () => {
    const core = client("the report body", 200, "text/plain");

    const out = await tool$pipeshubDownloadRecord.tool(
      core, { recordId: "rec-1" } as never, ctx(),
    );

    expect(out.content).toEqual([{ type: "text", text: "the report body" }]);
  });

  test("a binary document arrives as a resource, not as mangled text", async () => {
    const core = client(new Uint8Array([1, 2, 3]), 200, "application/pdf");

    const out = await tool$pipeshubDownloadRecord.tool(
      core, { recordId: "rec-1" } as never, ctx(),
    );

    expect(out.content[0]).toMatchObject({ type: "resource" });
  });

  test("a failed download is flagged rather than handed over as the document", async () => {
    const core = client("not found", 404, "text/plain");

    const out = await tool$pipeshubDownloadRecord.tool(
      core, { recordId: "rec-1" } as never, ctx(),
    );

    expect(out.isError).toBe(true);
  });
});

describe("trimConversation", () => {
  const conv = {
    _id: "c-1",
    title: "Leave policy",
    status: "complete",
    messages: [
      { messageType: "user_query", content: "how much leave?" },
      { messageType: "bot_response", content: "first answer", confidence: "low", citations: [] },
      { messageType: "user_query", content: "and carry-over?" },
      {
        messageType: "bot_response",
        content: "the latest answer",
        confidence: "high",
        citations: [],
        followUpQuestions: ["what about sick leave?", { question: "and sabbaticals?" }],
      },
    ],
  };

  test("returns the latest answer, not the first", () => {
    // A conversation accumulates answers. Handing back the earliest would make
    // every follow-up appear to be ignored.
    const out = trimConversation(conv);
    expect(out.answer).toBe("the latest answer");
    expect(out.confidence).toBe("high");
    expect(out.messageCount).toBe(4);
  });

  test("follow-up questions are flattened whichever shape they arrive in", () => {
    expect(trimConversation(conv).followUpQuestions)
      .toEqual(["what about sick leave?", "and sabbaticals?"]);
  });

  test("a conversation with no answer yet is null rather than missing", () => {
    const out = trimConversation({ ...conv, messages: [conv.messages[0]] });
    expect(out.answer).toBeNull();
    expect(out.followUpQuestions).toEqual([]);
  });

  test("an unrecognisable conversation does not throw", () => {
    for (const bad of [undefined, null, {}, { messages: "not an array" }]) {
      expect(() => trimConversation(bad)).not.toThrow();
    }
    expect(trimConversation({}).messageCount).toBe(0);
  });
});
