// Shared by `serve` and `start --transport sse`. The local server can hold an
// operator's bearer token, so a web page the user happens to visit must not be
// able to drive it (DNS rebinding, cross-site POSTs). A request with no
// `Origin` header is a CLI or desktop client and is let through.

import type { RequestHandler } from "express";

/** Where the local HTTP server listens unless `--host` says otherwise. */
export const DEFAULT_HOST = "127.0.0.1";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Whether `origin` is http(s) on localhost, 127.0.0.1 or [::1], any port. */
export function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:")
      && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// The MCP transport headers plus the credential headers `serve` reads (tools.ts buildSDK).
const ALLOWED_HEADERS = [
  "Content-Type",
  "Accept",
  "Authorization",
  "Mcp-Protocol-Version",
  "Mcp-Session-Id",
  "Last-Event-ID",
  "bearerAuth",
  "clientID",
  "clientSecret",
  "tokenURL",
].join(", ");

/**
 * Refuse a browser request from any origin other than loopback with 403, and
 * answer CORS for loopback origins only (never `*`).
 */
export const loopbackOriginOnly: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (!isLoopbackOrigin(origin)) {
      res.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Forbidden: cross-origin requests are not allowed." },
        id: null,
      });
      return;
    }
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
