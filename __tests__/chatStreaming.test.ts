import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

// The answer arrives as a stream of frames rather than one response, so this
// tool has to decide what to hand back when the stream does not end the way it
// should. Those endings were the untested part, and they are the ones a person
// notices: a partial answer, no answer, or a connection that dropped.

/** A server that streams `frames` as server-sent events. */
function streaming(frames: Array<[string, unknown]>, opts: { cut?: boolean } = {}) {
  const body = frames
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("");
  const fetcher = async () =>
    new Response(
      opts.cut
        ? new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode(body));
              c.error(new Error("connection reset"));
            },
          })
        : body,
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "t" },
    httpClient: new HTTPClient({ fetcher }),
  });
}

const ask = (core: PipeshubCore, extra: Record<string, unknown> = {}) =>
  tool$pipeshubChat.tool(
    core,
    { query: "what is the leave policy?", ...extra } as never,
    { signal: new AbortController().signal } as never,
  );

const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");
const jsonOf = (r: { content: Array<{ text?: string }> }) => JSON.parse(textOf(r));

const CONVERSATION = {
  _id: "c-1",
  title: "Leave policy",
  status: "complete",
  messages: [
    { messageType: "user_query", content: "what is the leave policy?" },
    { messageType: "bot_response", content: "Twenty-five days.", citations: [] },
  ],
};

describe("a stream that ends properly", () => {
  test("returns the answer and the records behind it", async () => {
    const out = await ask(streaming([
      ["RUN_STARTED", { threadId: "t-1" }],
      ["RUN_FINISHED", { result: { conversation: CONVERSATION, recordsUsed: 3 } }],
    ]));

    expect(out.isError).toBeUndefined();
    expect(jsonOf(out)).toMatchObject({
      conversationId: "c-1",
      answer: "Twenty-five days.",
      recordsUsed: 3,
    });
  });
});

describe("a stream that ends badly", () => {
  test("an answer with no closing frame is handed over, labelled unfinished", async () => {
    // Throwing away a partial answer would be worse than returning it: the
    // person asked a question and the assistant has most of the reply. But it
    // has to say so, because the citations are missing and a model that assumes
    // otherwise will present an unsourced answer as a sourced one.
    const out = await ask(streaming([
      ["RUN_STARTED", { threadId: "t-1" }],
      ["conversation_created", { conversationId: "c-9", title: "Leave" }],
      ["TEXT_MESSAGE_CONTENT", { delta: "Twenty-five " }],
      ["TEXT_MESSAGE_CONTENT", { delta: "days." }],
    ]));

    expect(out.isError).toBeUndefined();
    const body = jsonOf(out);
    expect(body.answer).toBe("Twenty-five days.");
    expect(body.status).toBe("Inprogress");
    expect(body.citations).toEqual([]);
    expect(body.warning).toContain("RUN_FINISHED");
  });

  test("a stream carrying nothing at all says so rather than answering emptily", async () => {
    // An empty answer read as a real one is the worst outcome here: it tells
    // the person the organisation has nothing to say on the subject.
    const out = await ask(streaming([["RUN_STARTED", { threadId: "t-1" }]]));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("without any usable frames");
  });

  test("a stream that reports an error returns that error", async () => {
    const out = await ask(streaming([
      ["RUN_STARTED", { threadId: "t-1" }],
      ["RUN_ERROR", { message: "the model provider refused the request" }],
    ]));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("refused");
  });

  test("a connection that drops mid-answer is reported as a broken stream", async () => {
    const out = await ask(streaming(
      [["RUN_STARTED", { threadId: "t-1" }], ["TEXT_MESSAGE_CONTENT", { delta: "Twenty" }]],
      { cut: true },
    ));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("SSE stream failed");
  });
});

describe("a request the server rejects", () => {
  test("is reported with its status, not drained as an empty stream", async () => {
    // The streaming calls are configured to treat any HTTP status as success,
    // so a 401 arrives looking like an ordinary response. Without a status
    // check it reaches the stream reader and surfaces as "no usable frames",
    // which tells the reader nothing about what went wrong.
    const fetcher = async () =>
      Response.json({ message: "token expired" }, { status: 401 });
    const core = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });

    const out = await ask(core);

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("401");
    expect(textOf(out)).toContain("token expired");
  });
});

describe("talking to an agent", () => {
  /** Records the path and body the tool sent. */
  function recording(frames: Array<[string, unknown]>) {
    const sent: { url?: string; body?: unknown } = {};
    const body = frames
      .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      .join("");
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input as Request;
      sent.url = req.url;
      const raw = init?.body ?? (await req.clone().text().catch(() => ""));
      try { sent.body = JSON.parse(String(raw)); } catch { sent.body = raw; }
      return new Response(body, {
        status: 200, headers: { "content-type": "text/event-stream" },
      });
    };
    return {
      sent,
      core: new PipeshubCore({
        serverURL: "http://pipeshub.test/api/v1",
        security: { bearerAuth: "t" },
        httpClient: new HTTPClient({ fetcher }),
      }),
    };
  }

  const finished: Array<[string, unknown]> = [
    ["RUN_FINISHED", { result: { conversation: CONVERSATION, recordsUsed: 1 } }],
  ];

  test("a follow-up turn continues the same agent conversation", async () => {
    const { core, sent } = recording(finished);

    const out = await ask(core, { agentId: "a-1", conversationId: "c-1" });

    expect(out.isError).toBeUndefined();
    // The conversation id has to reach the server, or every turn starts afresh
    // and the agent has no memory of what was just said.
    expect(sent.url).toContain("c-1");
    expect(sent.url).toContain("a-1");
  });

  test("an agent turn is always sent in the one mode the agent stream accepts", async () => {
    // `quick` is the only mode the agent endpoint takes, so whatever the caller
    // asked for is replaced rather than forwarded and rejected.
    const { core, sent } = recording(finished);

    await ask(core, { agentId: "a-1", conversationId: "c-1", chatMode: "web_search" });

    expect((sent.body as { chatMode?: string })?.chatMode).toBe("quick");
  });
});
