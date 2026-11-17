// Public (`@pipeshub-ai/mcp/esm/mcp-server/oauth-scopes.js`). The PipesHub
// OAuth scopes each tool needs, so a host that knows a token's scopes can
// offer only the tools that token can run (`createMCPServer({
// grantedOAuthScopes })`) instead of tools that answer 403 when called.
//
// A scope is listed when a call the tool makes is refused without it: the
// Node route's `requireScopes` (any one of its scopes passes, so the one that
// covers every route the tool uses is named), or the Python service behind
// it. A call the tool already degrades around is not counted: the model
// listing in `pipeshub_sources` (config:read) and the coverage counts there
// and in `pipeshub_indexing_status` (connector:read) are left out with a
// note when the token lacks the scope.

const TOOL_SCOPES: Readonly<Record<string, readonly string[]>> = {
  // GET /knowledgeBase/knowledge-hub/nodes (kb:read).
  pipeshub_sources: ["kb:read"],
  // POST /search: Node takes semantic:read or semantic:write, the Python
  // search route requires semantic:write.
  pipeshub_search: ["semantic:write"],
  // GET /connectors/record/:id/content (connector:read); lookup and navigate
  // take kb:read or connector:read.
  pipeshub_get_record_content: ["connector:read"],
  // GET /knowledgeBase/stream/record/:id (kb:read).
  pipeshub_download_record: ["kb:read"],
  // GET /users, /users/:id (user:read), /userGroups (usergroup:read),
  // /teams/user/teams (team:read): one per action.
  pipeshub_directory: ["user:read", "usergroup:read", "team:read"],
  // POST /knowledgeBase (kb:write).
  pipeshub_create_collection: ["kb:write"],
  // POST /knowledgeBase/:kbId/upload (kb:upload).
  pipeshub_upload: ["kb:upload"],
  // GET /connectors/:id/stats (connector:read or kb:read) and
  // /knowledgeBase/knowledge-hub/nodes/app/:id (kb:read).
  pipeshub_indexing_status: ["kb:read"],
  // Builds a link to the web app; calls nothing.
  pipeshub_connect_source: [],
  // POST /connectors, PUT .../config/filters-sync (connector:write),
  // POST .../toggle (connector:sync).
  pipeshub_add_web_source: ["connector:write", "connector:sync"],
  // POST /conversations/stream (conversation:chat). agent:execute is not
  // required: a host gates connected actions on it (`allowChatActions`), and
  // an `agentId` turn without it is refused by the agent route as a tool error.
  pipeshub_chat: ["conversation:chat"],
  // GET /agents (agent:read).
  pipeshub_agents: ["agent:read"],
  // GET /connectors/record/:id/content (connector:read).
  pipeshub_show_citations: ["connector:read"],
  // GET /knowledgeBase/stream/record/:id (kb:read).
  pipeshub_preview_record: ["kb:read"],
};

/**
 * The PipesHub OAuth scopes `toolName` needs, all of them; `[]` for a tool
 * that calls nothing, `undefined` for a tool this package does not define.
 */
export function requiredOAuthScopes(toolName: string): readonly string[] | undefined {
  return Object.hasOwn(TOOL_SCOPES, toolName) ? TOOL_SCOPES[toolName] : undefined;
}
