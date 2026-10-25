// The stdio bridge: what `npx @pipeshub-ai/mcp start` runs for a coding agent.
//
// It is a proxy. `tools/list` and `tools/call` go to the instance's own `/mcp`
// with the CLI's stored sign-in, so the agent sees exactly the server's tool
// set (search, read, the pipeshub_code_* tools, and whatever the server adds
// later) with no package release per tool. Two things differ from the server:
//   - PIPESHUB_MCP_CHAT=off hides pipeshub_chat and pipeshub_agents;
//   - one tool exists only here, `index_workspace`, because only a process on
//     the laptop can read the agent's open folders (MCP roots) and push them.
//
// shortcut: tools/list is fetched on every request (the server is stateless and
// cheap); cache it if a client is seen polling.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "node:url";
import { pipeshubInstructions } from "../mcp-server/instructions.js";
import { newRequestId, postMcp } from "./client.js";
import { CliError } from "./config.js";
import { indexRepo } from "./standalone/index.js";

export interface BridgeAuth {
  origin: string;
  /** The current bearer; called on every request so a refreshed sign-in is used. */
  token: () => Promise<string>;
}

export interface BridgeOptions {
  auth: BridgeAuth;
  /** Mount pipeshub_chat and pipeshub_agents. */
  chat: boolean;
  /** Overrides the per-request timeouts (tests). */
  timeoutMs?: number;
  log?: (line: string) => void;
}

export const INDEX_TOOL = "index_workspace";
const CHAT_TOOLS = new Set(["pipeshub_chat", "pipeshub_agents"]);

const INDEX_TOOL_DEF: Tool = {
  name: INDEX_TOOL,
  description:
    "Index the folder(s) open in this editor into PipesHub's code graph so the pipeshub_code_* tools can answer about them. "
    + "It finds the open folders itself (MCP roots), pushes only git-tracked and untracked-not-ignored text files that changed since last time, "
    + "and reports the indexing status. Safe to call again: it is incremental. Call it before asking code questions about a repository that has not been indexed, "
    + "or after large changes. Needs a git repository.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "A folder inside a git repository. Only needed when the client does not share its open folders; otherwise the open folders are used.",
      },
      waitSeconds: {
        type: "number",
        minimum: 0,
        maximum: 300,
        description: "How long to wait for indexing to finish before reporting its current status. Default 20; 0 returns right after the files are sent.",
      },
    },
    additionalProperties: false,
  },
  annotations: { title: "Index the open workspace", readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

/**
 * A link in a tool result the person can open. A pushed repository's records carry an internal `local-repo://<key>/<path>` link: a search
 * hit gets the record's page in PipesHub instead, and a bare `web_url` (no record to point to) is dropped, so the key is never shown.
 */
function openableLinks(value: unknown, origin: string): unknown {
  const isWeb = (v: unknown) => typeof v === "string" && /^https?:\/\//i.test(v);
  if (Array.isArray(value)) return value.map((v) => openableLinks(v, origin));
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (k === "webUrl" && typeof v === "string" && !isWeb(v)) {
      if (typeof obj["recordId"] === "string") out[k] = `${origin}/record/${obj["recordId"]}`;
    } else if (k === "web_url" && typeof v === "string" && !isWeb(v)) {
      continue;
    } else {
      out[k] = openableLinks(v, origin);
    }
  }
  return out;
}

const withOpenableLinks = (result: CallToolResult, origin: string): CallToolResult => ({
  ...result,
  content: (result.content ?? []).map((c) => {
    if (c.type !== "text" || !/"web_?[Uu]rl"\s*:\s*"(?!https?:)/.test(c.text)) return c; // nothing to fix: left byte for byte
    try {
      return { ...c, text: JSON.stringify(openableLinks(JSON.parse(c.text), origin)) };
    } catch {
      return c; // not JSON: left as the server wrote it
    }
  }),
});

const textError = (text: string): CallToolResult => ({ isError: true, content: [{ type: "text", text }] });

export function createBridge(opts: BridgeOptions): Server {
  const { auth } = opts;
  const hidden = opts.chat ? new Set<string>() : CHAT_TOOLS;
  const server = new Server(
    { name: "pipeshub", version: "1.0.0" },
    {
      capabilities: { tools: { listChanged: true } },
      instructions: pipeshubInstructions({ chat: opts.chat })
        + `\n## Code in this workspace\n\nIf \`${INDEX_TOOL}\` is listed, call it once before code questions about the open repository; the \`pipeshub_code_*\` tools, when listed, read what it indexed.\n`,
    },
  );

  const upstream = async (method: string, params?: Record<string, unknown>) =>
    postMcp(
      { origin: auth.origin, token: await auth.token(), insecureHttp: false, requestId: newRequestId(), ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}) },
      { method, ...(params ? { params } : {}) },
      method === "tools/list" ? 30_000 : 180_000,
    );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [];
    let cursor: string | undefined;
    try {
      do {
        const page = (await upstream("tools/list", cursor ? { cursor } : undefined)) as { tools?: Tool[]; nextCursor?: string };
        tools.push(...(page.tools ?? []));
        cursor = page.nextCursor;
      } while (cursor);
    } catch (e) {
      // A clear error, not an empty list: an empty list reads as "PipesHub has no tools".
      throw new McpError(ErrorCode.InternalError, e instanceof CliError ? e.message : `PipesHub did not answer: ${(e as Error).message}`);
    }
    return { tools: [...tools.filter((t) => !hidden.has(t.name) && t.name !== INDEX_TOOL), INDEX_TOOL_DEF] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req, extra): Promise<CallToolResult> => {
    const { name, arguments: args } = req.params;
    if (name === INDEX_TOOL) return indexWorkspace(args ?? {});
    if (hidden.has(name)) return textError(`${name} is turned off for this client (PIPESHUB_MCP_CHAT=off).`);
    try {
      return withOpenableLinks((await upstream("tools/call", { name, arguments: args ?? {} })) as CallToolResult, auth.origin);
    } catch (e) {
      return textError(e instanceof CliError ? e.message : `PipesHub did not answer: ${(e as Error).message}`);
    }

    async function indexWorkspace(a: Record<string, unknown>): Promise<CallToolResult> {
      const progressToken = req.params._meta?.progressToken;
      let step = 0;
      const say = (message: string) => {
        opts.log?.(message);
        if (progressToken !== undefined) {
          void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: ++step, message } }).catch(() => undefined);
        }
      };
      const explicit = typeof a["path"] === "string" && a["path"] !== "" ? [a["path"]] : [];
      let folders = explicit;
      if (folders.length === 0) {
        folders = await rootFolders(server);
        if (folders.length === 0) {
          return textError(
            "This client did not share its open folders (MCP roots), so there is nothing to index. Pass { \"path\": \"<a folder in a git repository>\" }, "
              + "or run 'pipeshub index' in the repository.",
          );
        }
      }
      const wait = typeof a["waitSeconds"] === "number" ? Math.max(0, Math.min(300, a["waitSeconds"])) : 20;
      const results: Record<string, unknown>[] = [];
      for (const folder of folders) {
        try {
          say(`Indexing ${folder} ...`);
          results.push({ folder, ok: true, ...(await indexRepo(folder, { origin: auth.origin, token: await auth.token() }, say, wait)) });
        } catch (e) {
          results.push({ folder, ok: false, error: e instanceof CliError ? e.message : (e as Error).message });
        }
      }
      const ok = results.some((r) => r["ok"] === true);
      // The server lists the code tools only once a repository is indexed; a client that listed tools earlier must list them again.
      if (results.some((r) => r["codeTools"] === true)) void server.sendToolListChanged().catch(() => undefined);
      const note = results.some((r) => r["ok"] === true && r["state"] !== "ready")
        ? "Indexing continues on the server; call index_workspace again (or ask a code question) shortly."
        : undefined;
      const payload = { folders: results, ...(note ? { note } : {}) };
      return { ...(ok ? {} : { isError: true }), content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    }
  });

  return server;
}

/** The client's open folders as local paths; none when it shares no roots or an answer fails. */
async function rootFolders(server: Server): Promise<string[]> {
  if (!server.getClientCapabilities()?.roots) return [];
  try {
    const { roots } = await server.listRoots(undefined, { timeout: 5000 });
    return roots.filter((r) => r.uri.startsWith("file:")).map((r) => fileURLToPath(r.uri));
  } catch {
    return [];
  }
}
