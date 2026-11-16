// Connectors, collections and agents as MCP resources, so a person can pick
// one in the client's attach menu. A picked resource reaches the model as
// text, not as a tool argument, so the text tells the model what to do with
// the id: a source limits `pipeshub_search`, an agent takes the question in
// `pipeshub_chat`. The model applies it; the server cannot.
//
// MCP has no groups for resources, and clients show one flat list, so each
// name starts with its group ("Connector · ") and the list is sorted by group.
// The client's search box then filters by group.

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../core.js";
import { listAllAgents, listAllSources, SourceItem } from "./tools/_helpers.js";

export const SOURCE_URI_TEMPLATE = "pipeshub://source/{arg}/{id}";

/** The `pipeshub_search` argument that takes this source's id. */
const argFor = (s: SourceItem) => (s.kind === "knowledgeBase" ? "kb" : "apps");
const uriFor = (s: SourceItem) => `pipeshub://source/${argFor(s)}/${encodeURIComponent(s.id)}`;
const label = (s: SourceItem) =>
  s.kind === "knowledgeBase"
    ? `Collection · ${s.name ?? s.id}`
    : `Connector · ${s.name ?? s.id}${s.connector ? ` (${s.connector})` : ""}`;

async function sources(client: PipeshubCore, signal: AbortSignal) {
  const listed = await listAllSources(client, { signal });
  if (!listed.ok) throw new Error(`PipesHub sources: ${listed.reason}`);
  // Connectors first, then collections; the sort keeps each group's order.
  return listed.sources
    .filter((s) => typeof s.id === "string" && s.id)
    .sort((a, b) => Number(a.kind === "knowledgeBase") - Number(b.kind === "knowledgeBase"));
}

export function registerSourceResources(server: McpServer, getClient: () => PipeshubCore): void {
  server.registerResource(
    "PipesHub source",
    new ResourceTemplate(SOURCE_URI_TEMPLATE, {
      list: async (extra) => ({
        resources: (await sources(getClient(), extra.signal)).map((s) => ({
          uri: uriFor(s),
          name: label(s),
          mimeType: "text/plain",
          description: `Search only ${label(s)} in PipesHub.`,
        })),
      }),
    }),
    {
      mimeType: "text/plain",
      description: "A PipesHub connector or collection to search in. Attach one to limit `pipeshub_search` to it.",
    },
    async (uri, vars, extra) => {
      const id = decodeURIComponent(String(vars["id"]));
      // The URI comes from the client: answer only for a source this user can see.
      const s = (await sources(getClient(), extra.signal)).find((x) => x.id === id);
      if (!s || argFor(s) !== vars["arg"]) throw new Error(`No PipesHub source at ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: `The user chose this PipesHub source: ${label(s)}, id ${s.id}.\n`
            + `On every \`pipeshub_search\` call, pass \`${argFor(s)}: ["${s.id}"]\` so the search `
            + "covers only this source, until the user asks to search more widely.",
        }],
      };
    },
  );
}

export const AGENT_URI_TEMPLATE = "pipeshub://agent/{id}";

async function agents(client: PipeshubCore, signal: AbortSignal) {
  const listed = await listAllAgents(client, { signal });
  if (!listed.ok) {
    const first = listed.result.content[0];
    throw new Error(`PipesHub agents: ${first?.type === "text" ? first.text : "list failed"}`);
  }
  return listed.agents.filter((a) => typeof a._key === "string" && a._key && a.isActive !== false);
}

/** Agents to talk to; registered only where `pipeshub_chat` is. */
export function registerAgentResources(server: McpServer, getClient: () => PipeshubCore): void {
  server.registerResource(
    "PipesHub agent",
    new ResourceTemplate(AGENT_URI_TEMPLATE, {
      list: async (extra) => {
        // An agent list that fails leaves the agents out, not the sources with them.
        const listed = await agents(getClient(), extra.signal).catch(() => []);
        return {
          resources: listed.map((a) => ({
            uri: `pipeshub://agent/${encodeURIComponent(a._key)}`,
            name: `Agent · ${a.name ?? a._key}`,
            mimeType: "text/plain",
            description: `Ask the PipesHub agent ${a.name ?? a._key}.`,
          })),
        };
      },
    }),
    {
      mimeType: "text/plain",
      description: "A PipesHub agent. Attach one to send your questions to it through `pipeshub_chat`.",
    },
    async (uri, vars, extra) => {
      const id = decodeURIComponent(String(vars["id"]));
      // The URI comes from the client: answer only for an agent this user can see.
      const a = (await agents(getClient(), extra.signal)).find((x) => x._key === id);
      if (!a) throw new Error(`No PipesHub agent at ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: `The user chose the PipesHub agent "${a.name ?? a._key}", id ${a._key}.\n`
            + `Send the user's questions to this agent: call \`pipeshub_chat\` with \`agentId: "${a._key}"\`. `
            + "On follow-ups, pass the same `agentId` with the `conversationId` from the previous answer, "
            + "until the user asks to stop using this agent.",
        }],
      };
    },
  );
}
