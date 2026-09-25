import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { PipeshubCore } from "../src/core.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { PIPESHUB_INSTRUCTIONS } from "../src/mcp-server/instructions.js";
import { createRegisterPrompt, formatResult } from "../src/mcp-server/prompts.js";
import type { MCPScope } from "../src/mcp-server/scopes.js";
import { createMCPServer } from "../src/mcp-server/server.js";

// `pipeshub-assistant` is the one prompt a person can pick from their MCP
// client's prompt menu. It seeds the tool-routing guidance, optionally
// applied to a request they type.

const logger = createConsoleLogger("error");
const sdk = () => new PipeshubCore({ serverURL: "http://pipeshub.test/api/v1" });

async function connect(server: McpServer): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  return client;
}

const textOf = (r: Awaited<ReturnType<Client["getPrompt"]>>) => {
  const c = r.messages[0]?.content;
  return c && c.type === "text" ? c.text : "";
};

describe("pipeshub-assistant", () => {
  test("is listed with its optional query argument", async () => {
    const client = await connect(createMCPServer({ logger, getSDK: sdk }).server);
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["pipeshub-assistant"]);
    expect(prompts[0]?.arguments).toEqual([
      expect.objectContaining({ name: "query", required: false }),
    ]);
  });

  test("without a query it is exactly the server instructions", async () => {
    const client = await connect(createMCPServer({ logger, getSDK: sdk }).server);
    // `arguments: {}` rather than none: SDK 1.26 rejects a prompts/get with no
    // arguments object even when every argument is optional.
    const r = await client.getPrompt({ name: "pipeshub-assistant", arguments: {} });
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]?.role).toBe("user");
    expect(textOf(r)).toBe(PIPESHUB_INSTRUCTIONS);
    // The same text is sent as the server's instructions at initialize, so the
    // two cannot drift apart.
    expect(client.getInstructions()).toBe(PIPESHUB_INSTRUCTIONS);
  });

  test("with a query it applies the guidance to that request", async () => {
    const client = await connect(createMCPServer({ logger, getSDK: sdk }).server);
    const r = await client.getPrompt({
      name: "pipeshub-assistant",
      arguments: { query: "find the Q3 board deck" },
    });
    const text = textOf(r);
    expect(text.startsWith(PIPESHUB_INSTRUCTIONS)).toBe(true);
    expect(text.endsWith("\n\nfind the Q3 board deck")).toBe(true);
    expect(text).toContain("`pipeshub_agents`");
  });

  test("stays available under the read scope", async () => {
    const client = await connect(createMCPServer({ logger, getSDK: sdk, scopes: ["read"] }).server);
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(["pipeshub-assistant"]);
  });
});

describe("createRegisterPrompt", () => {
  const register = (scopes: MCPScope[]) => {
    const server = new McpServer({ name: "t", version: "1" });
    return { server, prompt: createRegisterPrompt(logger, server, sdk, new Set(scopes)) };
  };
  const echo = (text: string) => () => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
  });

  test("with a scope filter, prompts without scopes are left out", async () => {
    const { server, prompt } = register(["read"]);
    prompt({ name: "unscoped", prompt: echo("u") });
    prompt({ name: "scoped", scopes: ["read"], prompt: echo("s") });
    const client = await connect(server);
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(["scoped"]);
  });

  test("registers prompts with and without descriptions and arguments", async () => {
    const { server, prompt } = register([]);
    prompt({ name: "bare", prompt: echo("bare") });
    prompt({ name: "described", description: "d", prompt: echo("described") });
    prompt({
      name: "with-args",
      args: { who: z.string() },
      prompt: (_c, args) => ({
        messages: [{ role: "user", content: { type: "text", text: `hi ${args.who}` } }],
      }),
    });
    prompt({
      name: "with-args-described",
      description: "d2",
      args: { who: z.string() },
      prompt: (_c, args) => ({
        messages: [{ role: "user", content: { type: "text", text: `hey ${args.who}` } }],
      }),
    });
    const client = await connect(server);

    const listed = (await client.listPrompts()).prompts;
    expect(listed.map((p) => [p.name, p.description ?? null])).toEqual([
      ["bare", null],
      ["described", "d"],
      ["with-args", null],
      ["with-args-described", "d2"],
    ]);
    expect(textOf(await client.getPrompt({ name: "bare" }))).toBe("bare");
    expect(textOf(await client.getPrompt({ name: "described" }))).toBe("described");
    expect(textOf(await client.getPrompt({ name: "with-args", arguments: { who: "a" } }))).toBe("hi a");
    expect(textOf(await client.getPrompt({ name: "with-args-described", arguments: { who: "b" } })))
      .toBe("hey b");
  });

  test("formatResult wraps text as a single user message", async () => {
    expect(await formatResult("x")).toEqual({
      messages: [{ role: "user", content: { type: "text", text: "x" } }],
    });
  });
});
