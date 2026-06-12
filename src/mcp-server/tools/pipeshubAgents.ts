// (`GET /agents`) — each already carrying its `toolsets` and `knowledge` — so
// the LLM can route on real capability rather than the often-generic
// description. Pick an agent's `agentId` and pass it to `pipeshub_chat`'s
// `agentId` to converse with it. Single API call, no per-agent fan-out.

import * as z from "zod";
import { ToolDefinition } from "../tools.js";
import { jsonResult, listAllAgents, trimAgent } from "./_helpers.js";

const args = {
  search: z.string().optional().describe(
    "Optional case-insensitive substring match across agent name, "
      + "description, and tags. Omit to return every agent.",
  ),
};

export const tool$pipeshubAgents: ToolDefinition<typeof args> = {
  name: "pipeshub_agents",
  description:
    `List the PipesHub **agents** configured for this org, each with its
capabilities.

Agents are specialized assistants (custom system prompt, tools, knowledge
scope). To converse with one, take its \`agentId\` and pass it to
\`pipeshub_chat\`'s \`agentId\` argument.

Each agent is returned as:
\`{ agentId, name, description, systemPrompt, startMessage, tags, webSearch,
isActive, toolsets, knowledge }\`.
- \`toolsets\` — what the agent can DO: each \`{ name, tools }\` where \`name\`
  is the connector (e.g. \`jira\`, \`gmail\`) and \`tools\` are the runnable
  tool ids (e.g. \`jira.create_issue\`, \`gmail.send_email\`).
- \`knowledge\` — what the agent can READ: each \`{ name, type }\` (e.g.
  \`Confluence-2\` / \`Confluence\`).

**Route on \`toolsets\`/\`knowledge\`, not the name** — names and descriptions
are often generic or misleading. Match the request to the agent whose tools can
actually perform it (e.g. "create a Jira ticket" → the agent whose toolset is
\`jira\` and whose tools include \`jira.create_issue\`). If NO agent has a tool
for the requested action, say so — don't force an unrelated agent.

The list **may be empty** (no agents configured). For plain Q&A when no
specific agent is needed, use \`pipeshub_chat\` WITHOUT \`agentId\` and pick a
\`chatMode\`: \`internal_search\` (org's indexed knowledge) or \`web_search\`
(live web). Use \`agentId\` everywhere an agent is referenced.`,
  scopes: ["read"],
  annotations: {
    title: "List PipesHub agents (with toolsets & knowledge)",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const all = await listAllAgents(client, {
      search: args.search,
      signal: ctx.signal,
    });
    if (!all.ok) return all.result;

    return jsonResult({
      agents: all.agents.map(trimAgent),
      total: all.total,
      ...(all.truncated ? { truncated: true } : {}),
    });
  },
};
