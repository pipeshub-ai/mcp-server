# Pipeshub 
Model Context Protocol (MCP) Server for the *Pipeshub* API.

<!-- Start Summary [summary] -->
## Summary

PipesHub API: Unified API documentation for PipesHub services.

PipesHub is an enterprise-grade platform providing:
- User authentication and management
- Document storage and version control
- Knowledge base management
- Enterprise search and conversational AI
- Third-party integrations via connectors
- System configuration management
- Crawling job scheduling
- Email services

## Authentication
Most endpoints require JWT Bearer token authentication. Some internal endpoints use scoped tokens for service-to-service communication.

## Base URLs
All endpoints use the `/api/v1` prefix unless otherwise noted.
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
* [Pipeshub](#pipeshub)
  * [Authentication](#authentication)
  * [Base URLs](#base-urls)
  * [Installation](#installation)
  * [Development](#development)
  * [Contributions](#contributions)
  * [Progressive Discovery](#progressive-discovery)

<!-- End Table of Contents [toc] -->

<!-- Start Installation [installation] -->
## Installation

<details>
<summary>Claude Desktop</summary>

Install the MCP server as a Desktop Extension using the pre-built [`mcp-server.mcpb`](./mcp-server.mcpb) file:

Simply drag and drop the [`mcp-server.mcpb`](./mcp-server.mcpb) file onto Claude Desktop to install the extension.

The MCP bundle package includes the MCP server and all necessary configuration. Once installed, the server will be available without additional setup.

> [!NOTE]
> MCP bundles provide a streamlined way to package and distribute MCP servers. Learn more about [Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions).

</details>

<details>
<summary>Cursor</summary>

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=SDK&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJtY3AiLCJzdGFydCIsIi0tc2VydmVyLXVybCIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsIi0tYmVhcmVyLWF1dGgiLCIiLCItLWNsaWVudC1pZCIsIiIsIi0tY2xpZW50LXNlY3JldCIsIiIsIi0tdG9rZW4tdXJsIiwiL2FwaS92MS9vYXV0aC90b2tlbiJdfQ==)

Or manually:

1. Open Cursor Settings
2. Select Tools and Integrations
3. Select New MCP Server
4. If the configuration file is empty paste the following JSON into the MCP Server Configuration:

```json
{
  "command": "npx",
  "args": [
    "mcp",
    "start",
    "--server-url",
    "http://localhost:3000",
    "--bearer-auth",
    "",
    "--client-id",
    "",
    "--client-secret",
    "",
    "--token-url",
    "/api/v1/oauth/token"
  ]
}
```

</details>

<details>
<summary>Claude Code CLI</summary>

```bash
claude mcp add SDK -- npx -y mcp start --server-url http://localhost:3000 --bearer-auth  --client-id  --client-secret  --token-url /api/v1/oauth/token
```

</details>
<details>
<summary>Gemini</summary>

```bash
gemini mcp add SDK -- npx -y mcp start --server-url http://localhost:3000 --bearer-auth  --client-id  --client-secret  --token-url /api/v1/oauth/token
```

</details>
<details>
<summary>Windsurf</summary>

Refer to [Official Windsurf documentation](https://docs.windsurf.com/windsurf/cascade/mcp#adding-a-new-mcp-plugin) for latest information

1. Open Windsurf Settings
2. Select Cascade on left side menu
3. Click on `Manage MCPs`. (To Manage MCPs you should be signed in with a Windsurf Account)
4. Click on `View raw config` to open up the mcp configuration file.
5. If the configuration file is empty paste the full json

```bash
{
  "command": "npx",
  "args": [
    "mcp",
    "start",
    "--server-url",
    "http://localhost:3000",
    "--bearer-auth",
    "",
    "--client-id",
    "",
    "--client-secret",
    "",
    "--token-url",
    "/api/v1/oauth/token"
  ]
}
```
</details>
<details>
<summary>VS Code</summary>

[![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20SDK%20MCP&color=0098FF)](vscode://ms-vscode.vscode-mcp/install?name=SDK&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJtY3AiLCJzdGFydCIsIi0tc2VydmVyLXVybCIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsIi0tYmVhcmVyLWF1dGgiLCIiLCItLWNsaWVudC1pZCIsIiIsIi0tY2xpZW50LXNlY3JldCIsIiIsIi0tdG9rZW4tdXJsIiwiL2FwaS92MS9vYXV0aC90b2tlbiJdfQ==)

Or manually:

Refer to [Official VS Code documentation](https://code.visualstudio.com/api/extension-guides/ai/mcp) for latest information

1. Open [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
1. Search and open `MCP: Open User Configuration`. This should open mcp.json file
2. If the configuration file is empty paste the full json

```bash
{
  "command": "npx",
  "args": [
    "mcp",
    "start",
    "--server-url",
    "http://localhost:3000",
    "--bearer-auth",
    "",
    "--client-id",
    "",
    "--client-secret",
    "",
    "--token-url",
    "/api/v1/oauth/token"
  ]
}
```

</details>
<details>
<summary> Stdio installation via npm </summary>
To start the MCP server, run:

```bash
npx mcp start --server-url http://localhost:3000 --bearer-auth  --client-id  --client-secret  --token-url /api/v1/oauth/token
```

For a full list of server arguments, run:

```
npx mcp --help
```

</details>
<!-- End Installation [installation] -->

## Development

Run locally without a published npm package:
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Run `node ./bin/mcp-server.js start --server-url  --bearer-auth`
To use this local version with Cursor, Claude or other MCP Clients, you'll need to add the following config:

```json
{
  "command": "node",
  "args": [
    "./bin/mcp-server.js",
    "start",
    "--server-url",
    "",
    "--bearer-auth",
    ""
  ]
}
```

Or to debug the MCP server locally, use the official MCP Inspector: 

```bash
npx @modelcontextprotocol/inspector node ./bin/mcp-server.js start --server-url  --bearer-auth
```



## Contributions

While we value contributions to this MCP Server, the code is generated programmatically. Any manual changes added to internal files will be overwritten on the next generation.
We look forward to hearing your feedback. Feel free to open a PR or an issue with a proof of concept and we'll do our best to include it in a future release.

<!-- Start Progressive Discovery [dynamic-mode] -->
## Progressive Discovery

MCP servers with many tools can bloat LLM context windows, leading to increased token usage and tool confusion. Dynamic mode solves this by exposing only a small set of meta-tools that let agents progressively discover and invoke tools on demand.

To enable dynamic mode, pass the `--mode dynamic` flag when starting your server:

```jsonc
{
  "mcpServers": {
    "SDK": {
      "command": "npx",
      "args": ["mcp", "start", "--mode", "dynamic"],
      // ... other server arguments
    }
  }
}
```

In dynamic mode, the server registers only the following meta-tools instead of every individual tool:

- **`list_tools`**: Lists all available tools with their names and descriptions.
- **`describe_tool`**: Returns the input schema for one or more tools by name.
- **`execute_tool`**: Executes a tool by name with the provided input parameters.

This approach significantly reduces the number of tokens sent to the LLM on each request, which is especially useful for servers with a large number of tools.
<!-- End Progressive Discovery [dynamic-mode] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->
