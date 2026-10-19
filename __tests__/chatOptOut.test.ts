import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../src/core.js";
import { CHAT_ENV, chatEnabledFromEnv } from "../src/mcp-server/chat-setting.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { pipeshubInstructions, PIPESHUB_INSTRUCTIONS } from "../src/mcp-server/instructions.js";
import { createMCPServer } from "../src/mcp-server/server.js";
import { withoutChatMentions } from "../src/mcp-server/chat-mentions.js";

// Search and read is the default way to answer; chat is optional. Leaving it
// out has to leave out everything that points at it, or the host is told to
// call a tool it cannot see.

const logger = createConsoleLogger("error");
const sdk = () => new PipeshubCore({ serverURL: "http://pipeshub.test/api/v1" });
const WITHOUT_CHAT = [
  "pipeshub_sources",
  "pipeshub_search",
  "pipeshub_get_record_content",
  "pipeshub_download_record",
  "pipeshub_directory",
];

async function connect(server: McpServer): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  return client;
}

const saved = process.env[CHAT_ENV];
afterEach(() => {
  if (saved === undefined) delete process.env[CHAT_ENV];
  else process.env[CHAT_ENV] = saved;
});

describe("PIPESHUB_MCP_CHAT", () => {
  test("is on when unset or on, off when off", () => {
    expect(chatEnabledFromEnv({})).toBe(true);
    for (const v of ["", "on", "ON", " on "]) {
      expect(chatEnabledFromEnv({ [CHAT_ENV]: v })).toBe(true);
    }
    for (const v of ["off", "Off", " off "]) {
      expect(chatEnabledFromEnv({ [CHAT_ENV]: v })).toBe(false);
    }
  });

  test("any other value is an error that names the variable and the choices", () => {
    // README.md and server.json document "on" and "off" only.
    for (const v of ["no-chat", "true", "1", "false", "0"]) {
      expect(() => chatEnabledFromEnv({ [CHAT_ENV]: v }))
        .toThrow(new RegExp(`PIPESHUB_MCP_CHAT must be "on" or "off".*got "${v}"`));
    }
  });
});

describe("a server without chat", () => {
  test("mounts the search-and-read tools only, in order", () => {
    const { tools } = createMCPServer({ logger, chat: false });
    expect(tools.map((t) => t.name)).toEqual(WITHOUT_CHAT);
  });

  test("the environment variable turns it off, and the option wins over it", () => {
    process.env[CHAT_ENV] = "off";
    expect(createMCPServer({ logger }).tools.map((t) => t.name)).toEqual(WITHOUT_CHAT);
    expect(createMCPServer({ logger, chat: true }).tools.map((t) => t.name))
      .toContain("pipeshub_chat");
    delete process.env[CHAT_ENV];
    expect(createMCPServer({ logger }).tools.map((t) => t.name))
      .toContain("pipeshub_chat");
  });

  test("its instructions and prompt never name a tool it does not mount", async () => {
    const client = await connect(createMCPServer({ logger, getSDK: sdk, chat: false }).server);
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toBe(pipeshubInstructions({ chat: false }));
    const mounted = new Set((await client.listTools()).tools.map((t) => t.name));
    for (const named of instructions.match(/pipeshub_[a-z_]+/g) ?? []) {
      expect(`${named}: ${mounted.has(named)}`).toBe(`${named}: true`);
    }
    // The caveats that do not depend on chat are still there.
    const flat = instructions.replace(/\s+/g, " ");
    expect(flat).toContain("## Default: search, then read");
    expect(flat).toContain("Reply Count: N");
    expect(flat).toContain("do NOT count search hits: navigate the record group");

    // No mounted tool's description or argument text names one either, or
    // points at a chat citation.
    for (const t of (await client.listTools()).tools) {
      const text = `${t.description ?? ""} ${JSON.stringify(t.inputSchema)}`;
      for (const named of text.match(/pipeshub_[a-z_]+/g) ?? []) {
        expect(`${t.name} names ${named}: ${mounted.has(named)}`)
          .toBe(`${t.name} names ${named}: true`);
      }
      expect(`${t.name}: ${/chat citation|citations\[\*\]/.test(text)}`).toBe(`${t.name}: false`);
    }

    const { prompts } = await client.listPrompts();
    expect(prompts[0]?.description).not.toContain("pipeshub_agents");
    const r = await client.getPrompt({
      name: "pipeshub-assistant",
      arguments: { query: "find the Q3 board deck" },
    });
    const c = r.messages[0]?.content;
    const text = c && c.type === "text" ? c.text : "";
    expect(text.startsWith(instructions)).toBe(true);
    expect(text).not.toContain("pipeshub_agents");
    expect(text).toContain("find the Q3 board deck");
  });

  test("with chat, the instructions are the full text", () => {
    expect(pipeshubInstructions({ chat: true })).toBe(PIPESHUB_INSTRUCTIONS);
    expect(PIPESHUB_INSTRUCTIONS).toContain("pipeshub_chat");
    expect(PIPESHUB_INSTRUCTIONS).toContain("pipeshub_agents");
  });
});

describe("cutting chat mentions from tool descriptions", () => {
  test("a server with chat keeps the descriptions as written", () => {
    const withChat = createMCPServer({ logger, chat: true }).tools;
    const without = new Map(createMCPServer({ logger, chat: false }).tools
      .map((t) => [t.name, t.description]));
    const search = withChat.find((t) => t.name === "pipeshub_search");
    expect(search?.description).toContain("pipeshub_chat");
    expect(without.get("pipeshub_search")).not.toContain("pipeshub_chat");
  });

  test("a cut that no longer matches its description fails loudly", () => {
    expect(() => withoutChatMentions({ name: "pipeshub_search", description: "rewritten" }))
      .toThrow(/pipeshub_search: its description no longer contains the chat mention/);
  });

  test("an argument text that no longer matches its cut fails loudly", () => {
    const rewritten = { recordId: z.string().describe("rewritten") };
    expect(() => withoutChatMentions({ name: "pipeshub_download_record", description: "Get `recordId` from a chat citation or a `pipeshub_search` hit.", args: rewritten }))
      .toThrow(/pipeshub_download_record: its recordId argument no longer contains the chat mention/);
  });

  test("a tool with nothing to cut is returned as is", () => {
    const def = { name: "pipeshub_directory", description: "people" };
    expect(withoutChatMentions(def)).toBe(def);
  });
});
