import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import { createMCPServer } from "../src/mcp-server/server.js";

// Hosts read `readOnlyHint` to decide what they may run side by side: Claude
// Code runs a batch of MCP calls in parallel only when every tool in it is
// read-only, and one after another otherwise. A tool that only reads must say
// so, or an agent's parallel searches queue behind each other. A tool that can
// act on the user's behalf must not, or a host may run it without asking.

/** Tools that only read: every backend call they make is a GET, except search's POST, which only records the caller's own search history. */
const READ_ONLY = [
  "pipeshub_sources",
  "pipeshub_search",
  "pipeshub_get_record_content",
  "pipeshub_download_record",
  "pipeshub_directory",
  "pipeshub_agents",
  "pipeshub_indexing_status",
  "pipeshub_connect_source",
  "pipeshub_preview_record",
];

/** Tools that add to the user's own collections: they write, but never delete or overwrite. */
const WRITES = ["pipeshub_create_collection", "pipeshub_upload"];

/** Tools that can act: chat runs the assistant, which may use the user's connected actions. */
const ACTS = ["pipeshub_chat"];

async function listedTools() {
  const { server } = createMCPServer({ logger: createConsoleLogger("error") });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  const { tools } = await client.listTools();
  await client.close();
  return new Map(tools.map((t) => [t.name, t.annotations ?? {}]));
}

describe("tool annotations as a host sees them", () => {
  test("every registered tool is classed here, so a new one cannot skip this check", async () => {
    const tools = await listedTools();
    expect([...tools.keys()].sort()).toEqual([...READ_ONLY, ...WRITES, ...ACTS].sort());
  });

  test("tools that only read declare readOnlyHint: true", async () => {
    const tools = await listedTools();
    for (const name of READ_ONLY) {
      expect({ name, readOnlyHint: tools.get(name)?.readOnlyHint })
        .toEqual({ name, readOnlyHint: true });
      expect({ name, destructiveHint: tools.get(name)?.destructiveHint })
        .toEqual({ name, destructiveHint: false });
    }
  });

  test("tools that add documents are not read-only, and not destructive", async () => {
    const tools = await listedTools();
    for (const name of WRITES) {
      expect({ name, readOnlyHint: tools.get(name)?.readOnlyHint, destructiveHint: tools.get(name)?.destructiveHint })
        .toEqual({ name, readOnlyHint: false, destructiveHint: false });
    }
  });

  test("pipeshub_search is read-only, so a host can run several at once", async () => {
    const search = (await listedTools()).get("pipeshub_search");
    expect(search?.readOnlyHint).toBe(true);
  });

  test("pipeshub_chat stays not read-only and destructive, because it can run actions", async () => {
    const chat = (await listedTools()).get("pipeshub_chat");
    expect(chat?.readOnlyHint).toBe(false);
    expect(chat?.destructiveHint).toBe(true);
  });
});
