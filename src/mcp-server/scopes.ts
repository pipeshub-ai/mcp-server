// Hand-maintained (listed in .genignore). `--scope read` keeps only the tools
// that cannot change PipesHub data. `connect` tools create a connector and start
// its sync (they need connector:write and connector:sync, not just kb:write).

export const mcpScopes = [
  "read",
  "write",
  "connect",
] as const;

export type MCPScope = (typeof mcpScopes)[number];
