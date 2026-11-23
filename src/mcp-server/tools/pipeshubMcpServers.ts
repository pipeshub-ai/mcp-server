// pipeshub_mcp_servers — the user's external MCP servers in PipesHub's catalog
// (GitHub, Jira, Linear, ...): whether they are signed in to each, and each
// signed-in server's tools. Read-only: one `GET /mcp-servers/my-mcp-servers`.
// Run a listed tool with `pipeshub_run_mcp_tool`.

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod";
import { PipeshubCore } from "../../core.js";
import { mcpServersListMine } from "../../funcs/mcpServers.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";
import { webOrigin } from "./_writeHelpers.js";

/** A tool description longer than this is cut when every server is listed. */
const DESCRIPTION_MAX_CHARS = 300;

const args = {
  server: z.string().trim().min(1).max(200).optional().describe(
    "Only this server: its `instanceId`, or a case-insensitive part of its name "
      + "(e.g. \"github\"). With one server, each tool also carries its "
      + "`inputSchema`, which `pipeshub_run_mcp_tool` needs. Omit to list every server.",
  ),
  includeSchemas: z.boolean().optional().describe(
    "Include each tool's `inputSchema`. Defaults to true when `server` is set "
      + "and false otherwise, since a long list of schemas costs many tokens.",
  ),
};

const toolShape = z.looseObject({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  kind: z.string().optional(),
});

const outputSchema = {
  servers: z.array(z.looseObject({
    instanceId: z.string(),
    name: z.string(),
    signedIn: z.boolean(),
    tools: z.array(toolShape).optional(),
  })),
  total: z.number(),
  signInUrl: z.string(),
  notes: z.array(z.string()).optional(),
};

type Entry = {
  _id?: unknown;
  name?: unknown;
  typeId?: unknown;
  description?: unknown;
  scope?: unknown;
  isAuthenticated?: unknown;
  disabledReason?: unknown;
  tools?: unknown;
  toolsError?: unknown;
  toolsErrorCode?: unknown;
  toolsTimedOut?: unknown;
};

type Tool = {
  name?: unknown;
  description?: unknown;
  kind?: unknown;
  inputSchema?: unknown;
  annotations?: { title?: unknown } | null;
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;

function cut(text: string | undefined, max: number): string | undefined {
  if (text === undefined || text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function shapeTool(t: Tool, schemas: boolean, fullDescription: boolean) {
  const name = str(t.name);
  if (!name) return undefined;
  const description = str(t.description);
  return {
    name,
    ...(str(t.annotations?.title) ? { title: str(t.annotations?.title) } : {}),
    ...(description
      ? { description: fullDescription ? description : cut(description, DESCRIPTION_MAX_CHARS) }
      : {}),
    // read, write or destructive: what the tool does to data, which sets its
    // starting approval rule when the user has not set one.
    ...(str(t.kind) ? { kind: str(t.kind) } : {}),
    ...(schemas ? { inputSchema: t.inputSchema ?? {} } : {}),
  };
}

function shapeServer(e: Entry, schemas: boolean, fullDescription: boolean) {
  const instanceId = str(e._id);
  if (!instanceId) return undefined;
  const signedIn = e.isAuthenticated === true;
  const disabled = str(e.disabledReason);
  const tools = Array.isArray(e.tools)
    ? (e.tools as Tool[]).map((t) => shapeTool(t, schemas, fullDescription)).filter((t) => t !== undefined)
    : [];
  return {
    instanceId,
    name: str(e.name) ?? instanceId,
    ...(str(e.typeId) ? { type: str(e.typeId) } : {}),
    ...(str(e.description) ? { description: cut(str(e.description), DESCRIPTION_MAX_CHARS) } : {}),
    ...(str(e.scope) ? { scope: str(e.scope) } : {}),
    signedIn,
    ...(disabled ? { disabled } : {}),
    ...(signedIn ? { tools } : {}),
    ...(str(e.toolsError)
      ? { toolsError: str(e.toolsError), ...(str(e.toolsErrorCode) ? { toolsErrorCode: str(e.toolsErrorCode) } : {}) }
      : {}),
    ...(e.toolsTimedOut === true ? { toolsTimedOut: true } : {}),
  };
}

function matches(e: Entry, server: string): boolean {
  if (str(e._id) === server) return true;
  const needle = server.toLowerCase();
  return [e.name, e.typeId].some((v) => str(v)?.toLowerCase().includes(needle));
}

export async function listMcpServers(
  client: PipeshubCore,
  args: { server?: string | undefined; includeSchemas?: boolean | undefined },
  signal?: AbortSignal,
): Promise<{ ok: true; entries: Entry[] } | { ok: false; result: CallToolResult }> {
  const r = await mcpServersListMine(
    client,
    { includeTools: true },
    signal ? { fetchOptions: { signal } } : undefined,
  );
  if (!r.ok) return { ok: false, result: errorResult(`MCP server list: ${r.error.message}`) };
  const httpErr = await httpErrorResult(r.value, "MCP server list");
  if (httpErr) return { ok: false, result: httpErr };
  const body = await readJson<{ instances?: Entry[] }>(r.value, "MCP server list");
  if (!body.ok) return { ok: false, result: body.result };
  const all = Array.isArray(body.value.instances) ? body.value.instances : [];
  return { ok: true, entries: args.server ? all.filter((e) => matches(e, args.server!)) : all };
}

export const tool$pipeshubMcpServers: ToolDefinition<typeof args> = {
  name: "pipeshub_mcp_servers",
  description: `List the user's external MCP servers in PipesHub (GitHub, Jira,
...), whether they are signed in to each, and each signed-in server's tools
with their \`kind\` (read, write, destructive). Pass \`server\` to get the
tools' \`inputSchema\`, then run one with \`pipeshub_run_mcp_tool\`. A server
with \`signedIn: false\` has no tools: the user signs in at \`signInUrl\`.`,
  scopes: ["read"],
  annotations: {
    title: "List the user's MCP servers and their tools",
    destructiveHint: false,
    idempotentHint: true,
    // The tools are read live from the external servers.
    openWorldHint: true,
    readOnlyHint: true,
  },
  args,
  outputSchema,
  tool: async (client, args, ctx) => {
    const listed = await listMcpServers(client, args, ctx.signal);
    if (!listed.ok) return listed.result;
    const one = listed.entries.length === 1 && args.server !== undefined;
    const schemas = args.includeSchemas ?? args.server !== undefined;
    const servers = listed.entries
      .map((e) => shapeServer(e, schemas, one))
      .filter((s) => s !== undefined);
    const notes: string[] = [];
    if (args.server && servers.length === 0) {
      notes.push(`No MCP server matches "${args.server}". Call again without \`server\` to see them all.`);
    } else if (servers.length === 0) {
      notes.push("The user has no MCP servers. An admin adds them to the catalog, or the user adds their own, at signInUrl.");
    }
    const notSignedIn = servers.filter((s) => !s.signedIn && !("disabled" in s)).length;
    if (notSignedIn > 0) {
      notes.push(`${notSignedIn} server(s) need the user to sign in at signInUrl before their tools can be listed or run.`);
    }
    return jsonResult({
      servers,
      total: servers.length,
      signInUrl: new URL("/workspace/mcp-servers/personal/", webOrigin(client)).toString(),
      ...(notes.length ? { notes } : {}),
    });
  },
};
