// Hand-maintained (listed in .genignore). `--scope read` keeps only the tools
// that cannot change PipesHub data.

export const mcpScopes = [
  "read",
  "write",
] as const;

export type MCPScope = (typeof mcpScopes)[number];
