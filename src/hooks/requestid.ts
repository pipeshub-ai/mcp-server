/*
 * Stamp an x-request-id trace header onto every outbound SDK request, reusing
 * the id bound for the current MCP tool/resource/prompt call (see
 * request-context.ts) so all backend calls from one invocation share it.
 *
 * Format mirrors the TypeScript SDK's own RequestIDHook: `mcp-<userId>-<random>`
 * when the bearer JWT carries a userId claim, else `mcp-<random>`. The userId
 * is only knowable once a request actually carries a resolved Authorization
 * header, so it's decoded off the first outbound request of the tool call and
 * cached on the bound context for every subsequent call to reuse verbatim.
 */

import { getRequestContextStore, newRequestId } from "./request-context.js";
import { BeforeRequestContext, BeforeRequestHook } from "./types.js";

const REQUEST_ID_HEADER = "x-request-id";

/** Decodes the JWT payload without verifying the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof claims === "object" && claims !== null ? claims : null;
  } catch {
    return null;
  }
}

function userIdFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  const claims = decodeJwtPayload(token);
  return (claims?.["userId"] as string) || null;
}

export class RequestIDHook implements BeforeRequestHook {
  beforeRequest(_hookCtx: BeforeRequestContext, request: Request): Request {
    if (request.headers.get(REQUEST_ID_HEADER)) {
      return request;
    }

    const store = getRequestContextStore();
    if (!store) {
      // No bound tool-call context (shouldn't happen in practice).
      request.headers.set(REQUEST_ID_HEADER, newRequestId());
      return request;
    }

    if (!store.finalId) {
      const userId = userIdFromRequest(request);
      store.finalId = userId
        ? `mcp-${userId}-${store.random}`
        : `mcp-${store.random}`;
    }
    request.headers.set(REQUEST_ID_HEADER, store.finalId);
    return request;
  }
}
