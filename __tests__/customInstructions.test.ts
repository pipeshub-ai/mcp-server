import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../src/core.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import {
  CLIENT_INSTRUCTIONS_LIMIT,
  customInstructionsSection,
  MAX_CUSTOM_INSTRUCTIONS_CHARS,
  pipeshubInstructions,
  SHOW_CITATIONS_STEP,
} from "../src/mcp-server/instructions.js";
import { createMCPServer } from "../src/mcp-server/server.js";

// A workspace admin's instructions reach every assistant that connects:
// first in the server instructions, then PipesHub's own guidance, whole.

const logger = createConsoleLogger("error");
const sdk = () => new PipeshubCore({ serverURL: "http://pipeshub.test/api/v1" });

async function connect(server: McpServer): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  return client;
}

const ORG = "Answer in British English. Name the source system of every fact.";

describe("workspace instructions", () => {
  test("come first, ahead of PipesHub's own guidance, which follows whole", async () => {
    const client = await connect(
      createMCPServer({ logger, getSDK: sdk, customInstructions: ORG }).server,
    );
    const own = pipeshubInstructions({ chat: true }).replace(SHOW_CITATIONS_STEP, "");
    expect(client.getInstructions()).toBe(`${customInstructionsSection(ORG)}${own}`);
    expect(client.getInstructions()?.startsWith("## This workspace's instructions")).toBe(true);
    expect(client.getInstructions()).toContain(ORG);
  });

  test("are in the pipeshub-assistant prompt too, so the two never differ", async () => {
    const client = await connect(
      createMCPServer({ logger, getSDK: sdk, customInstructions: ORG }).server,
    );
    const r = await client.getPrompt({ name: "pipeshub-assistant", arguments: {} });
    const c = r.messages[0]?.content;
    expect(c?.type === "text" ? c.text : "").toBe(client.getInstructions()!);
  });

  test("unset, blank or whitespace sends exactly the guidance it sent before", () => {
    const before = pipeshubInstructions({ chat: true });
    for (const none of [undefined, "", "   \n\t "]) {
      expect(pipeshubInstructions({ chat: true, customInstructions: none })).toBe(before);
      expect(customInstructionsSection(none)).toBe("");
    }
  });

  test("are sent with chat left out, and the guidance still names no chat tool", () => {
    const text = pipeshubInstructions({ chat: false, customInstructions: ORG });
    expect(text.startsWith(customInstructionsSection(ORG))).toBe(true);
    expect(text).not.toContain("pipeshub_chat");
    expect(text).not.toContain("pipeshub_agents");
  });

  test("longer than the limit are cut at a word, never past it", () => {
    const long = "word ".repeat(400).trim();
    const section = customInstructionsSection(long);
    const body = section.split("\n\n")[2]!;
    expect(body.length).toBeLessThanOrEqual(MAX_CUSTOM_INSTRUCTIONS_CHARS);
    expect(body.endsWith("word")).toBe(true);
    expect(customInstructionsSection("x".repeat(MAX_CUSTOM_INSTRUCTIONS_CHARS + 50)))
      .toContain("x".repeat(MAX_CUSTOM_INSTRUCTIONS_CHARS) + "\n");
  });

  test("at the limit, with PipesHub's longest guidance, fit what a client keeps", () => {
    const most = "y".repeat(MAX_CUSTOM_INSTRUCTIONS_CHARS);
    for (const chat of [true, false]) {
      for (const actions of [true, false]) {
        const text = pipeshubInstructions({ chat, actions, customInstructions: most });
        expect(text.length).toBeLessThanOrEqual(CLIENT_INSTRUCTIONS_LIMIT);
      }
    }
  });
});
