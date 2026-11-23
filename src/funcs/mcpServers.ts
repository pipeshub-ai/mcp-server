/*
 * Hand-written: the MCP catalog calls `pipeshub_mcp_servers` and
 * `pipeshub_run_mcp_tool` make. They are the user's external MCP servers
 * (GitHub, Jira, ...) that an admin added to PipesHub's catalog.
 */

import { PipeshubCore } from "../core.js";
import { encodeFormQuery } from "../lib/encodings.js";
import { RequestOptions } from "../lib/sdks.js";
import { pathToFunc } from "../lib/url.js";
import { send } from "./knowledgeBaseWrite.js";

/**
 * `GET /mcp-servers/my-mcp-servers` → `{ instances: [...] }`: every server the
 * user can see, whether they are signed in, and (with `includeTools`) each
 * signed-in server's tools, read live or from the tool cache.
 */
export function mcpServersListMine(
  client$: PipeshubCore,
  query: { includeTools: boolean },
  options?: RequestOptions,
) {
  return send(client$, {
    operationID: "getMyMcpServers",
    oAuth2Scopes: ["mcp:read"],
    method: "GET",
    path: pathToFunc("/mcp-servers/my-mcp-servers")(),
    query: encodeFormQuery({ includeTools: query.includeTools }),
  }, options);
}

/**
 * `POST /mcp-servers/instances/{instanceId}/tools/call` → `{ ran: true, result }`
 * or `{ ran: false, reason, rule, message }`. PipesHub runs the call with the
 * user's own sign-in and checks their tool approval rules first.
 */
export function mcpServersCallTool(
  client$: PipeshubCore,
  instanceId: string,
  body: { tool: string; arguments: Record<string, unknown> },
  options?: RequestOptions,
) {
  return send(client$, {
    operationID: "callMcpInstanceTool",
    oAuth2Scopes: ["agent:execute"],
    method: "POST",
    path: pathToFunc("/mcp-servers/instances/{instanceId}/tools/call")({ instanceId }),
    body: JSON.stringify(body),
    json: true,
  }, options);
}
