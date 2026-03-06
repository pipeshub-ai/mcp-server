# Connecting MCP Clients to PipesHub MCP Server

This guide covers how to connect PipesHub's remote MCP server to **Cursor**, **Claude Code**, **Gemini CLI**, and **Claude.ai (Web)** using static OAuth credentials.

PipesHub exposes a remote MCP endpoint over **Streamable HTTP** at `/mcp`.MCP Clients connect to this endpoint directly -- no local npm packages or stdio processes needed.

## Prerequisites

- A running PipesHub instance (self-hosted or cloud)
- An OAuth app created in PipesHub (see [Step 1](#step-1-create-an-oauth-app-in-pipeshub))

## Step 1: Create an OAuth App in PipesHub

1. Log in to your PipesHub instance as an admin
2. Navigate to **Settings > Developer Settings > OAuth Apps**
3. Click **Create OAuth App**
4. Fill in the app details:
   - **Name**: e.g., `MCP Integration`
   - **Redirect URIs**: Add all the redirect URIs for the clients you plan to use:

     | Client | Redirect URI |
     |---|---|
     | **Cursor** | `cursor://anysphere.cursor-mcp/oauth/callback` |
     | **Claude Code** | `http://localhost:<PORT>/callback` (e.g., `http://localhost:8080/callback`) |
     | **Claude.ai (Web)** | `https://claude.ai/oauth/callback` |
     | **Gemini CLI** | `http://localhost:7777/oauth/callback` |

> **Important:** The scopes in [`MCP_SCOPES`](https://github.com/pipeshub-ai/pipeshub-ai/blob/main/backend/env.template#L57) must match the scopes granted to your OAuth app — a mismatch will result in an authorization error.

5. Save the app and copy the **Client ID** and **Client Secret**

### Customizing Default Scopes

By default, PipesHub advertises some default scopes in its `/.well-known/oauth-protected-resource/mcp` discovery endpoint. You can customize which scopes are advertised by setting the [`MCP_SCOPES`](https://github.com/pipeshub-ai/pipeshub-ai/blob/main/backend/env.template#L57) environment variable on your PipesHub instance. This is useful for clients like Claude Code that automatically request all advertised scopes.

## Placeholders

Replace these in all configurations below:

| Placeholder | Description | Example |
|---|---|---|
| `PIPESHUB_INSTANCE_URL` | Your PipesHub instance URL | `https://app.pipeshub.com` |
| `YOUR_CLIENT_ID` | OAuth app client ID | `clid_abc123...` |
| `YOUR_CLIENT_SECRET` | OAuth app client secret | `clsec_xyz789...` |

The remote MCP endpoint URL is: `PIPESHUB_INSTANCE_URL/mcp`

---

## Remote MCP Setup

<details>
<summary><strong>Cursor</strong></summary>

Cursor supports static OAuth for remote MCP servers via the `auth` object in `mcp.json`.

![Cursor MCP Configuration](./images/cursor.png)

### Configuration

Open Cursor Settings > Tools and Integrations > New MCP Server, or edit your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pipeshub": {
      "url": "PIPESHUB_INSTANCE_URL/mcp",
      "auth": {
        "CLIENT_ID": "YOUR_CLIENT_ID",
        "CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "scopes": [
          "org:read", "org:write", "org:admin",
          "user:read", "user:write", "user:invite", "user:delete",
          "usergroup:read", "usergroup:write",
          "team:read", "team:write",
          "kb:read", "kb:write", "kb:delete", "kb:upload",
          "semantic:read", "semantic:write", "semantic:delete",
          "conversation:read", "conversation:write", "conversation:chat",
          "agent:read", "agent:write", "agent:execute",
          "connector:read", "connector:write", "connector:sync", "connector:delete",
          "config:read", "config:write",
          "document:read", "document:write", "document:delete",
          "crawl:read", "crawl:write", "crawl:delete"
        ]
      }
    }
  }
}
```

Cursor will auto-discover the authorization and token endpoints via PipesHub's `/.well-known/oauth-protected-resource/mcp` metadata.

> **Note:** If the `scopes` field is omitted, Cursor fetches `/.well-known/oauth-protected-resource/mcp` and requests **all** `scopes_supported` listed there. To limit access, explicitly list only the scopes you need. You can also control which scopes are advertised server-side — see [Customizing Default Scopes](#customizing-default-scopes).

### Using Environment Variables

Use Cursor's `${env:VAR}` interpolation to keep secrets out of config files:

```json
{
  "mcpServers": {
    "pipeshub": {
      "url": "${env:PIPESHUB_INSTANCE_URL}/mcp",
      "auth": {
        "CLIENT_ID": "${env:PIPESHUB_CLIENT_ID}",
        "CLIENT_SECRET": "${env:PIPESHUB_CLIENT_SECRET}",
        "scopes": [
          "kb:read", "kb:write",
          "semantic:read", "semantic:write",
          "conversation:read", "conversation:write", "conversation:chat",
          "agent:read", "agent:write", "agent:execute",
          "connector:read", "connector:write",
          "config:read", "user:read"
        ]
      }
    }
  }
}
```

### Redirect URI

Cursor uses a fixed redirect URI for all MCP servers:

```
cursor://anysphere.cursor-mcp/oauth/callback
```

Register this as the allowed redirect URI when creating the OAuth app in PipesHub.

### OAuth Login Troubleshooting

If Cursor's internal browser fails to load the OAuth login page, copy the authorization URL from the internal browser and paste it into your normal browser to complete the login flow.

</details>

<details>
<summary><strong>Claude Code</strong></summary>

Claude Code supports remote HTTP MCP servers with static OAuth credentials via `--client-id`, `--client-secret`, and `--callback-port`.

PipesHub exposes discovery at `/.well-known/oauth-protected-resource/mcp`, so Claude Code auto-discovers the authorization and token endpoints.

> **Important:** Claude Code does **not** support configuring specific scopes. It fetches `/.well-known/oauth-protected-resource/mcp`, reads the `scopes_supported` list, and requests **all** of them. Your OAuth app in PipesHub **must have access to all scopes** listed in the discovery endpoint, otherwise the authorization request will fail. To limit the advertised scopes, see [Customizing Default Scopes](#customizing-default-scopes).

### Add with CLI

```bash
claude mcp add --transport http \
  --client-id YOUR_CLIENT_ID \
  --client-secret \
  --callback-port 8080 \
  pipeshub PIPESHUB_INSTANCE_URL/mcp
```

> `--client-secret` without a value prompts for masked input. To skip the prompt, set the `MCP_CLIENT_SECRET` environment variable:
>
> ```bash
> MCP_CLIENT_SECRET=YOUR_CLIENT_SECRET claude mcp add --transport http \
>   --client-id YOUR_CLIENT_ID \
>   --client-secret \
>   --callback-port 8080 \
>   pipeshub PIPESHUB_INSTANCE_URL/mcp
> ```

To make it available across all projects:

```bash
claude mcp add --transport http --scope user \
  --client-id YOUR_CLIENT_ID \
  --client-secret \
  --callback-port 8080 \
  pipeshub PIPESHUB_INSTANCE_URL/mcp
```

### Add with JSON

```bash
claude mcp add-json pipeshub '{
  "type": "http",
  "url": "PIPESHUB_INSTANCE_URL/mcp",
  "oauth": {
    "clientId": "YOUR_CLIENT_ID",
    "callbackPort": 8080
  }
}' --client-secret
```

### Project-Scoped (`.mcp.json`)

Create a `.mcp.json` file in your project root. This can be committed to version control (secrets stay out via env vars):

```json
{
  "mcpServers": {
    "pipeshub": {
      "type": "http",
      "url": "${PIPESHUB_INSTANCE_URL}/mcp",
      "oauth": {
        "clientId": "${PIPESHUB_CLIENT_ID}",
        "callbackPort": 8080
      }
    }
  }
}
```

Set environment variables before launching Claude Code:

```bash
export PIPESHUB_INSTANCE_URL="https://app.pipeshub.com"
export PIPESHUB_CLIENT_ID="your-client-id"
```

> **Note:** The client secret is stored in the system keychain, not in config files. You'll be prompted to enter it when you first authenticate via `/mcp`.

### Authenticate

After adding the server, run `/mcp` inside Claude Code and follow the browser login flow. Tokens are stored securely and refreshed automatically.

### Verify

```bash
claude mcp list
claude mcp get pipeshub
```

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Gemini CLI supports remote MCP servers with OAuth via `dynamic_discovery` (the default), which auto-discovers authorization and token endpoints from PipesHub's `/.well-known/oauth-protected-resource/mcp`.

### Option A: Settings File

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "pipeshub": {
      "url": "PIPESHUB_INSTANCE_URL/mcp",
      "oauth": {
        "clientId": "YOUR_CLIENT_ID",
        "clientSecret": "YOUR_CLIENT_SECRET",
        "scopes": [
          "org:read", "org:write", "org:admin",
          "user:read", "user:write", "user:invite", "user:delete",
          "usergroup:read", "usergroup:write",
          "team:read", "team:write",
          "kb:read", "kb:write", "kb:delete", "kb:upload",
          "semantic:read", "semantic:write", "semantic:delete",
          "conversation:read", "conversation:write", "conversation:chat",
          "agent:read", "agent:write", "agent:execute",
          "connector:read", "connector:write", "connector:sync", "connector:delete",
          "config:read", "config:write",
          "document:read", "document:write", "document:delete",
          "crawl:read", "crawl:write", "crawl:delete"
        ]
      }
    }
  }
}
```

> **Note:** Adjust the `scopes` list to match what your OAuth app was granted. If you only need a subset of tools, you can limit the scopes accordingly.

### Option B: CLI Command

```bash
gemini mcp add --transport http pipeshub PIPESHUB_INSTANCE_URL/mcp
```

Then edit `~/.gemini/settings.json` to add the `oauth` block as shown above.

### Authenticate

Inside Gemini CLI, use the `/mcp auth` commands:

```bash
# List servers and their auth status
/mcp auth

# Authenticate with PipesHub (opens browser for login)
/mcp auth pipeshub

# Re-authenticate if tokens expire
/mcp auth pipeshub
```

On first connection, Gemini will automatically detect the 401 response, discover the OAuth endpoints, and open a browser for login. Tokens are stored securely in `~/.gemini/mcp-oauth-tokens.json` and refreshed automatically.

### Manage Servers

```bash
# List all configured servers
gemini mcp list

# Remove the server
gemini mcp remove pipeshub

# Temporarily disable/enable
gemini mcp disable pipeshub
gemini mcp enable pipeshub
```

### OAuth Configuration Properties

| Property | Required | Description |
|---|---|---|
| `clientId` | Yes | OAuth 2.0 Client ID from PipesHub |
| `clientSecret` | No | OAuth 2.0 Client Secret (for confidential clients) |
| `scopes` | No | OAuth scopes to request |
| `authorizationUrl` | No | Override authorization endpoint (auto-discovered by default) |
| `tokenUrl` | No | Override token endpoint (auto-discovered by default) |
| `redirectUri` | No | Override redirect URI (defaults to `http://localhost:7777/oauth/callback`) |

> **Note:** OAuth requires a local browser. It will not work in headless environments, remote SSH without X11 forwarding, or containers without browser access.

</details>

<details>
<summary><strong>Claude.ai (Web)</strong></summary>

Claude.ai supports custom connectors via remote MCP servers. This lets you use PipesHub tools directly in the Claude.ai web interface without any local setup.

> **Note:** This feature is currently in beta. Free plan users are limited to one custom connector.

![Claude.ai Connectors Settings](./images/claude-1.png)

![Claude.ai Add Custom Connector Dialog](./images/claude-2.png)

### For Individual Users (Pro / Max Plans)

1. Go to [claude.ai](https://claude.ai) and navigate to **Settings > Connectors**
2. Click **Add custom connector** at the bottom of the Connectors section
3. Enter the MCP server URL:
   ```
   PIPESHUB_INSTANCE_URL/mcp
   ```
4. Click **Advanced settings** and enter your OAuth credentials:
   - **OAuth Client ID**: `YOUR_CLIENT_ID`
   - **OAuth Client Secret**: `YOUR_CLIENT_SECRET`
5. Click **Add**
6. You'll be redirected to PipesHub's login page to authenticate and grant permissions
7. After authenticating, the connector will be active and PipesHub tools will be available in your Claude.ai conversations

### For Team / Enterprise Plans

**Organization Owners** must first add the connector:

1. Navigate to **Organization settings > Connectors**
2. Click **Add custom connector**
3. Enter the MCP server URL: `PIPESHUB_INSTANCE_URL/mcp`
4. Click **Advanced settings** and enter the OAuth Client ID and Client Secret
5. Click **Add**

**Team members** can then connect:

1. Go to **Settings > Connectors**
2. Find the PipesHub connector (marked with a "Custom" label)
3. Click **Connect** to authenticate via PipesHub's OAuth login

### Redirect URI

Claude.ai uses the following redirect URI for OAuth:

```
https://claude.ai/oauth/callback
```

Register this as an allowed redirect URI in your PipesHub OAuth app.

### Security Notes

- Only connect to trusted MCP servers
- Review the permissions requested during the OAuth authentication flow
- Claude.ai interacts with PipesHub on your behalf using the granted OAuth token — your password is never shared

</details>

---

## Local MCP Server (Stdio)

Instead of connecting to PipesHub's remote MCP endpoint, you can run the MCP server locally as a stdio process using the `@pipeshub-ai/mcp` npm package. This is useful when you prefer a local setup or need to work in environments where direct HTTP connections to the remote MCP endpoint aren't practical.

### Prerequisites

- Node.js 18+ installed
- A PipesHub instance URL
- Authentication credentials: either a **Bearer token** (JWT) or **OAuth Client ID + Secret**

### Placeholders

Replace these in all configurations below:

| Placeholder | Description | Example |
|---|---|---|
| `PIPESHUB_INSTANCE_URL` | Your PipesHub instance URL | `https://app.pipeshub.com` |
| `YOUR_BEARER_TOKEN` | JWT Bearer token for authentication | `eyJhbGci...` |
| `YOUR_CLIENT_ID` | OAuth app client ID | `clid_abc123...` |
| `YOUR_CLIENT_SECRET` | OAuth app client secret | `clsec_xyz789...` |

<details>
<summary><strong>Claude Desktop</strong></summary>

Configure in Claude Desktop settings (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

With OAuth credentials:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--client-id",
        "YOUR_CLIENT_ID",
        "--client-secret",
        "YOUR_CLIENT_SECRET",
        "--token-url",
        "/api/v1/oauth2/token"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor (Local)</strong></summary>

Open Cursor Settings > Tools and Integrations > New MCP Server, or edit your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

With OAuth credentials:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--client-id",
        "YOUR_CLIENT_ID",
        "--client-secret",
        "YOUR_CLIENT_SECRET",
        "--token-url",
        "/api/v1/oauth2/token"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Code CLI (Local)</strong></summary>

```bash
claude mcp add pipeshub -- npx -y @pipeshub-ai/mcp start \
  --server-url PIPESHUB_INSTANCE_URL \
  --bearer-auth YOUR_BEARER_TOKEN
```

With OAuth credentials:

```bash
claude mcp add pipeshub -- npx -y @pipeshub-ai/mcp start \
  --server-url PIPESHUB_INSTANCE_URL \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url /api/v1/oauth2/token
```

</details>

<details>
<summary><strong>Gemini CLI (Local)</strong></summary>

```bash
gemini mcp add pipeshub -- npx -y @pipeshub-ai/mcp start \
  --server-url PIPESHUB_INSTANCE_URL \
  --bearer-auth YOUR_BEARER_TOKEN
```

With OAuth credentials:

```bash
gemini mcp add pipeshub -- npx -y @pipeshub-ai/mcp start \
  --server-url PIPESHUB_INSTANCE_URL \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --token-url /api/v1/oauth2/token
```

</details>

<details>
<summary><strong>VS Code</strong></summary>

Open Command Palette > `MCP: Open User Configuration`, then add:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Open Windsurf Settings > Cascade > Manage MCPs > View raw config, then add:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Progressive Discovery (Dynamic Mode)</strong></summary>

The local MCP server exposes 300+ tools. To avoid context window bloat, enable **dynamic mode** which exposes only 3 meta-tools (`list_tools`, `describe_tool`, `execute_tool`) for progressive discovery:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "npx",
      "args": [
        "@pipeshub-ai/mcp",
        "start",
        "--mode",
        "dynamic",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Running from Source (Development)</strong></summary>

To run the local MCP server from a cloned repository instead of the npm package:

```bash
git clone https://github.com/pipeshub-ai/pipeshub-ai.git
cd pipeshub-ai
npm install
npm run build
node ./bin/mcp-server.js start --server-url PIPESHUB_INSTANCE_URL --bearer-auth YOUR_BEARER_TOKEN
```

For MCP client configuration, replace `npx @pipeshub-ai/mcp` with `node ./bin/mcp-server.js`:

```json
{
  "mcpServers": {
    "pipeshub": {
      "command": "node",
      "args": [
        "./bin/mcp-server.js",
        "start",
        "--server-url",
        "PIPESHUB_INSTANCE_URL",
        "--bearer-auth",
        "YOUR_BEARER_TOKEN"
      ]
    }
  }
}
```

To debug with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node ./bin/mcp-server.js start --server-url PIPESHUB_INSTANCE_URL --bearer-auth YOUR_BEARER_TOKEN
```

</details>

### CLI Help

For a full list of server arguments:

```bash
npx @pipeshub-ai/mcp --help
```

---

## How It Works

### Architecture

```
AI Client (Cursor / Claude Code / Gemini CLI / Claude.ai)
        │
        │  HTTP POST (JSON-RPC)
        │  Authorization: Bearer <token>
        ▼
  PIPESHUB_INSTANCE_URL/mcp
        │
        │  StreamableHTTP Transport
        │  (stateless, per-request MCP server)
        ▼
  PipesHub API (300+ tools via progressive discovery)
```


### OAuth Protected Resource Discovery

PipesHub exposes OAuth protected resource discovery at:

```
PIPESHUB_INSTANCE_URL/.well-known/oauth-protected-resource/mcp
```

This returns all OAuth endpoints automatically:
- Authorization: `PIPESHUB_INSTANCE_URL/api/v1/oauth2/authorize`
- Token: `PIPESHUB_INSTANCE_URL/api/v1/oauth2/token`
- Revocation: `PIPESHUB_INSTANCE_URL/api/v1/oauth2/revoke`
- JWKS: `PIPESHUB_INSTANCE_URL/.well-known/jwks.json`

---

## Troubleshooting

### "Incompatible auth server: does not support dynamic client registration"
This means the client is trying dynamic registration instead of using your pre-configured credentials. Make sure you passed `--client-id` and `--client-secret` (Claude Code) or the `auth` object (Cursor) correctly.

### Authentication fails / redirect error
- Ensure the **Redirect URI** in your OAuth app matches exactly what the client uses:
  - **Cursor**: `cursor://anysphere.cursor-mcp/oauth/callback`
  - **Claude Code**: `http://localhost:<callbackPort>/callback`
  - **Claude.ai**: `https://claude.ai/oauth/callback`
  - **Gemini CLI**: `http://localhost:7777/oauth/callback`
- Make sure the OAuth app is **active** (not suspended) in PipesHub

### Cannot reach MCP endpoint
- Verify the endpoint is accessible: `curl -X POST PIPESHUB_INSTANCE_URL/mcp` (should return 401, not connection error)
- Check that your PipesHub instance has MCP enabled

### Too many tools / context window bloat
The remote MCP server runs in **dynamic mode** (progressive discovery) by default, exposing only 3 meta-tools (`list_tools`, `describe_tool`, `execute_tool`). This keeps context usage minimal across all clients.

### Debugging with MCP Inspector
```bash
npx @modelcontextprotocol/inspector
```
Then connect to `PIPESHUB_INSTANCE_URL/mcp` with a Bearer token to test the endpoint directly.

---

## FAQ

<details>
<summary><strong>How do I update the scopes for my MCP integration?</strong></summary>

1. **Update the [`MCP_SCOPES`](https://github.com/pipeshub-ai/pipeshub-ai/blob/main/backend/env.template#L57) environment variable** on your PipesHub instance to include the new scopes you want advertised via the discovery endpoint.
2. **Update the OAuth app scopes** in PipesHub: go to **Settings > Developer Settings > OAuth Apps**, select your OAuth app, and add or remove scopes as needed.
3. **Re-authenticate the client** — existing tokens carry the old scopes, so you need to re-authenticate to get a new token with the updated scopes. For example:
   - **Cursor**: Remove and re-add the MCP server, or clear the cached OAuth token and reconnect.
   - **Claude Code**: Run `/mcp` and complete the browser login flow again.
   - **Gemini CLI**: Run `/mcp auth pipeshub` to re-authenticate.
   - **Claude.ai**: Disconnect and reconnect the connector in **Settings > Connectors**.

</details>
