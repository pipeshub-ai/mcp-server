# Publishing to Anthropic MCP Registry

To publish your MCP server to the [Anthropic MCP Registry](https://github.com/modelcontextprotocol/registry), follow these steps based on the [official publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md).

### Step 1: Configure mcpName in Your Generation Config

Add the `mcpName` field to your `.speakeasy/gen.yaml` file:

```yaml
mcp-typescript:
  mcpName: io.github.username/server-name  # Use reverse-DNS format
  # ... other configuration
```

The `mcpName` should follow the reverse-DNS format (e.g., `io.github.username/server-name`) to ensure uniqueness in the registry.

### Step 2: Regenerate Your MCP Server

Run Speakeasy generation with the updated configuration. This will:
- Add the `mcpName` field to your `package.json` (required for npm package validation)
- Generate a `server.json` file with registry metadata

### Step 3: Publish to npm

The registry validates npm packages by checking that your published package includes the `mcpName` field:

```bash
npm publish
```

The registry will fetch your package from npm and verify that the `mcpName` in `package.json` matches your server name.

### Step 4: Install the Publisher CLI

Install the `mcp-publisher` CLI tool:

**macOS/Linux (Homebrew)**:
```bash
brew install mcp-publisher
```

**macOS/Linux/WSL (curl)**:
```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
```

**Windows PowerShell**:
```powershell
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") { "arm64" } else { "amd64" }
Invoke-WebRequest -Uri "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_windows_$arch.tar.gz" -OutFile "mcp-publisher.tar.gz"
tar xf mcp-publisher.tar.gz mcp-publisher.exe
rm mcp-publisher.tar.gz
# Move mcp-publisher.exe to a directory in your PATH
```

### Step 5: Authenticate

Authenticate based on your namespace:

**For `io.github.*` namespaces (GitHub OAuth)**:
```bash
mcp-publisher login github
```

**For custom domains like `com.yourcompany.*` (DNS authentication)**:
```bash
# Generate keypair
openssl genpkey -algorithm Ed25519 -out key.pem

# Get public key for DNS record
echo "yourcompany.com. IN TXT \"v=MCPv1; k=ed25519; p=$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)\""

# Add the TXT record to your DNS, then login
mcp-publisher login dns --domain yourcompany.com --private-key $(openssl pkey -in key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n')
```

### Step 6: Publish to the Registry

From your server directory, publish to the registry:

```bash
mcp-publisher publish
```

You'll see:
```
✓ Successfully published
```

### Step 7: Verify Publication

Check that your server appears in the registry:

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.username/server-name"
```

For complete documentation including remote deployments, troubleshooting, and CI/CD automation, see the [official publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md).
