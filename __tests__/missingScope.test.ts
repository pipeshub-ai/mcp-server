import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { toolErrorToExit } from "../src/cli/client.js";
import { authStatus, missingScopesByCommand } from "../src/cli/commands.js";
import { EXIT } from "../src/cli/config.js";
import {
  httpErrorResult,
  requiredScopesFrom,
} from "../src/mcp-server/tools/_helpers.js";
import { tool$pipeshubChat } from "../src/mcp-server/tools/pipeshubChat.js";

// A personal access token's scopes are fixed when it is minted. When chat moved
// onto the assistant agent it started needing `agent:execute`, and every token
// minted before that got back a bare "Insufficient scope. Required:
// agent:execute". Nothing said the fix was a new token, so a model reading it
// fell back to search and the person never found out chat was gone.

const REFUSAL = "Insufficient scope. Required: agent:execute";

const textOf = (r: { content: Array<{ text?: string }> }): string =>
  r.content.map((c) => c.text ?? "").join("");

/** What a reader has to be told to recover. */
function expectActionable(text: string, scope: string): void {
  expect(text).toContain(scope);
  expect(text).toContain("new personal access token");
  expect(text).toContain("Developer Settings → Personal Access Tokens");
  // The token is valid; telling them to check its expiry sends them the wrong way.
  expect(text).not.toContain("not expired");
}

describe("reading a missing-scope refusal", () => {
  test("names the scope PipesHub asked for", () => {
    expect(requiredScopesFrom(REFUSAL)).toEqual(["agent:execute"]);
    expect(requiredScopesFrom("Insufficient scope. Required: kb:read or connector:read"))
      .toEqual(["kb:read", "connector:read"]);
  });

  test("leaves every other refusal alone", () => {
    expect(requiredScopesFrom("You do not have permission to view this record"))
      .toBeNull();
    expect(requiredScopesFrom("Invalid token")).toBeNull();
  });
});

describe("a missing scope refused as HTTP 403", () => {
  test("says which scope and that a new token is the fix", async () => {
    // The gateway's error envelope, as the error middleware writes it.
    const body = JSON.stringify({
      error: { code: "HTTP_FORBIDDEN", message: REFUSAL, requestId: "r-1" },
    });
    const out = await httpErrorResult(
      new Response(body, { status: 403, statusText: "Forbidden" }),
      "PipesHub chat request",
    );

    expect(out?.isError).toBe(true);
    expect(textOf(out!)).toContain("HTTP 403");
    expectActionable(textOf(out!), "agent:execute");
  });

  test("a 403 for any other reason keeps the general advice", async () => {
    const out = await httpErrorResult(
      new Response('{"message":"You do not have permission"}', { status: 403 }),
      "Get record content",
    );
    expect(textOf(out!)).not.toContain("new personal access token");
  });
});

describe("a missing scope refused inside the chat stream", () => {
  test("says which scope and that a new token is the fix", async () => {
    // The gateway checks only `conversation:chat`, opens the stream, and then
    // relays the assistant's refusal as a RUN_ERROR frame — so this case never
    // reaches the HTTP status check.
    const body = [
      ["CUSTOM", { name: "conversation_created", value: { conversationId: "c-1" } }],
      ["RUN_ERROR", { message: REFUSAL }],
    ].map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join("");
    const core = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({
        fetcher: async () =>
          new Response(body, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          }),
      }),
    });

    const out = await tool$pipeshubChat.tool(
      core,
      { query: "what is the leave policy?" } as never,
      { signal: new AbortController().signal } as never,
    );

    expect(out.isError).toBe(true);
    expectActionable(textOf(out), "agent:execute");
  });

  test("the CLI reports it as forbidden, not as a generic failure", () => {
    // Exit 4 is what a script branches on for "this token may not do that".
    expect(toolErrorToExit(REFUSAL)).toBe(EXIT.FORBIDDEN);
  });
});

// ─── auth status ─────────────────────────────────────────────────────────────

/** An unsigned token carrying `scopes`; the CLI only reads the claims. */
function tokenWith(scopes: string[]): string {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "none" })}.${part({ userId: "u-1", orgId: "o-1", scopes })}.sig`;
}

const PRE_AGENT_TOKEN = [
  "conversation:chat", "semantic:write", "kb:read", "user:read", "connector:read",
];

let server: ReturnType<typeof Bun.serve>;
let origin: string;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      Response.json({ jsonrpc: "2.0", id: 1, result: { tools: [{ name: "pipeshub_chat" }] } }),
  });
  origin = `http://127.0.0.1:${server.port}`;
});

afterAll(() => server.stop(true));

const status = (token: string) =>
  authStatus({
    origin,
    token,
    insecureHttp: false,
    requestId: "req-1",
    json: true,
    maxChars: 1000,
  });

describe("auth status", () => {
  test("warns that a token minted without agent:execute cannot run ask", async () => {
    const out = await status(tokenWith(PRE_AGENT_TOKEN));

    // Still connected and still exit 0: the token works for everything else.
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload["connected"]).toBe(true);
    expect(out.payload["missingScopes"]).toEqual({ ask: ["agent:execute"] });
    const warning = String(out.payload["warning"]);
    expect(warning).toContain("agent:execute");
    expect(warning).toContain("'ask'");
    expect(warning).toContain("Developer Settings → Personal Access Tokens");
  });

  test("says nothing when the token has every scope the commands need", async () => {
    const out = await status(tokenWith([...PRE_AGENT_TOKEN, "agent:execute"]));

    expect(out.payload["missingScopes"]).toEqual({});
    expect(out.payload["warning"]).toBeUndefined();
  });

  test("does not guess when the token's scopes cannot be read", async () => {
    // An opaque token would otherwise read as lacking everything.
    const out = await status("not-a-jwt");

    expect(out.payload["missingScopes"]).toBeNull();
    expect(out.payload["warning"]).toBeUndefined();
    expect(missingScopesByCommand([])).toBeNull();
  });
});
