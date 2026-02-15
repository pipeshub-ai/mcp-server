# pipeshub

Model Context Protocol (MCP) Server for the *pipeshub* API.

[![License: MIT](https://img.shields.io/badge/LICENSE_//_MIT-3b5bdb?style=for-the-badge&labelColor=eff6ff)](https://opensource.org/licenses/MIT)

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
* [pipeshub](#pipeshub)
  * [Authentication](#authentication)
  * [Base URLs](#base-urls)
  * [Installation](#installation)
  * [Development](#development)
  * [Contributions](#contributions)

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

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=Pipeshub&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJwaXBlc2h1YiIsInN0YXJ0IiwiLS1zZXJ2ZXItdXJsIiwiIiwiLS1iZWFyZXItYXV0aCIsIiJdfQ==)

Or manually:

1. Open Cursor Settings
2. Select Tools and Integrations
3. Select New MCP Server
4. If the configuration file is empty paste the following JSON into the MCP Server Configuration:

```json
{
  "command": "npx",
  "args": [
    "pipeshub",
    "start",
    "--server-url",
    "",
    "--bearer-auth",
    ""
  ]
}
```

</details>

<details>
<summary>Claude Code CLI</summary>

```bash
claude mcp add Pipeshub -- npx -y pipeshub start --server-url  --bearer-auth 
```

</details>
<details>
<summary>Gemini</summary>

```bash
gemini mcp add Pipeshub -- npx -y pipeshub start --server-url  --bearer-auth 
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
    "pipeshub",
    "start",
    "--server-url",
    "",
    "--bearer-auth",
    ""
  ]
}
```
</details>
<details>
<summary>VS Code</summary>

[![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Pipeshub%20MCP&color=0098FF)](vscode://ms-vscode.vscode-mcp/install?name=Pipeshub&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJwaXBlc2h1YiIsInN0YXJ0IiwiLS1zZXJ2ZXItdXJsIiwiIiwiLS1iZWFyZXItYXV0aCIsIiJdfQ==)

Or manually:

Refer to [Official VS Code documentation](https://code.visualstudio.com/api/extension-guides/ai/mcp) for latest information

1. Open [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
1. Search and open `MCP: Open User Configuration`. This should open mcp.json file
2. If the configuration file is empty paste the full json

```bash
{
  "command": "npx",
  "args": [
    "pipeshub",
    "start",
    "--server-url",
    "",
    "--bearer-auth",
    ""
  ]
}
```

</details>
<details>
<summary> Stdio installation via npm </summary>
To start the MCP server, run:

```bash
npx pipeshub start --server-url  --bearer-auth 
```

For a full list of server arguments, run:

```
npx pipeshub --help
```

</details>
<!-- End Installation [installation] -->

## Development

Run locally without a published npm package:
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Run `node ./bin/mcp-server.js start --server-url  --bearer-auth `
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
