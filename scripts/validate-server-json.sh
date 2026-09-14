#!/usr/bin/env bash
# Fail if server.json would be rejected by the official MCP registry.
# Local checks first (version / mcpName / description), then the same
# `mcp-publisher validate` call publish uses against the live registry.
set -euo pipefail
cd "$(dirname "$0")/.."

PKG=$(jq -r .version package.json)
MCP_NAME=$(jq -r .mcpName package.json)
MANIFEST=$(jq -r .version server.json)
PKG_ENTRY=$(jq -r '.packages[0].version' server.json)
SERVER_NAME=$(jq -r .name server.json)
DESC=$(jq -r .description server.json)

if [ "$PKG" != "$MANIFEST" ] || [ "$PKG" != "$PKG_ENTRY" ]; then
  echo "server.json version ($MANIFEST, packages[0]=$PKG_ENTRY) must equal package.json ($PKG)"
  exit 1
fi

if [ "$MCP_NAME" != "$SERVER_NAME" ]; then
  echo "package.json mcpName ($MCP_NAME) must equal server.json name ($SERVER_NAME)"
  exit 1
fi

if [ -f plugin.json ]; then
  PLUGIN=$(jq -r .version plugin.json)
  if [ "$PKG" != "$PLUGIN" ]; then
    echo "plugin.json version ($PLUGIN) must equal package.json ($PKG)"
    exit 1
  fi
fi

if [ ${#DESC} -gt 100 ]; then
  echo "server.json description is ${#DESC} chars; registry max is 100"
  exit 1
fi

publisher=""
if [ -x ./mcp-publisher ]; then
  publisher=./mcp-publisher
elif command -v mcp-publisher >/dev/null 2>&1; then
  publisher=mcp-publisher
else
  echo "mcp-publisher is required (CI/publish workflows install it before this script)"
  exit 1
fi

"$publisher" validate
