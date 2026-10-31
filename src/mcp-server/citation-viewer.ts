// The citation viewer: an MCP Apps view (https://modelcontextprotocol.io/
// extensions/apps) that hosts such as Claude show with a
// `pipeshub_show_citations` result, which the model calls before its answer.
// It lists the passages the answer relied on; opening one shows the cited
// record with the passage highlighted, as PipesHub's own chat does. A client
// that says at `initialize` it shows no views gets none of it (server.ts).

import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import type { PipeshubCore } from "../core.js";

export const CITATION_VIEWER_URI = "ui://pipeshub/citations.html";
const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

/**
 * Tool `_meta` that asks an MCP Apps host to show the viewer with the tool's
 * result. `ui/resourceUri` is the older spelling some hosts still read.
 */
export const citationViewerToolMeta = {
  ui: { resourceUri: CITATION_VIEWER_URI },
  "ui/resourceUri": CITATION_VIEWER_URI,
};

/** The client's capabilities say it shows MCP Apps views. */
export function clientShowsApps(capabilities: ClientCapabilities | undefined): boolean {
  const ui = capabilities?.extensions?.["io.modelcontextprotocol/ui"] as
    | { mimeTypes?: unknown }
    | undefined;
  return Array.isArray(ui?.mimeTypes) && ui.mimeTypes.includes(MCP_APP_MIME_TYPE);
}

/**
 * Whether each caller's client shows views, as its `initialize` said. A
 * stateless server sees `initialize` and the later calls in separate
 * requests, so it keeps the answer for the caller's token. A caller not
 * found here is assumed to show them: the card is the feature, and a client
 * without views only pays an extra call.
 * shortcut: in-process only, so another replica does not know; move it to a
 * shared store if text-only clients across replicas matter.
 */
const appsByCaller = new Map<string, { apps: boolean; at: number }>();
/** How long a client's answer is kept after its `initialize`. */
export const APPS_MEMORY_TTL_MS = 24 * 60 * 60_000;
const APPS_MEMORY_MAX = 10_000;

/** The caller, as a digest of its bearer token and the server. */
export function callerKey(client: PipeshubCore): string | undefined {
  const security = client._options.security;
  const token = typeof security === "object" ? security.bearerAuth : undefined;
  if (!token) return undefined;
  return `${createHash("sha256").update(token).digest("hex")}|${client._baseURL ?? ""}`;
}

export function recallApps(caller: string | undefined, now = Date.now()): boolean | undefined {
  const entry = caller ? appsByCaller.get(caller) : undefined;
  return entry && now - entry.at <= APPS_MEMORY_TTL_MS ? entry.apps : undefined;
}

export function rememberApps(caller: string | undefined, apps: boolean): void {
  if (!caller) return;
  appsByCaller.delete(caller);
  appsByCaller.set(caller, { apps, at: Date.now() });
  if (appsByCaller.size > APPS_MEMORY_MAX) {
    appsByCaller.delete(appsByCaller.keys().next().value!);
  }
}

/** Forgets every caller: for tests. */
export function clearAppsMemory(): void {
  appsByCaller.clear();
}

/** Key of the viewer's data in a tool result's `_meta`. */
export const CITATION_VIEWER_DATA_KEY = "pipeshub/citations";

export function registerCitationViewer(server: McpServer): void {
  server.registerResource(
    "PipesHub citations",
    CITATION_VIEWER_URI,
    {
      mimeType: MCP_APP_MIME_TYPE,
      description: "Shows a PipesHub answer with its citations, and opens "
        + "each cited record at the cited passage.",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: MCP_APP_MIME_TYPE,
        // Loaded when a host asks for the page, not when the server starts:
        // `npm run build` generates it, and a server or test that never
        // serves the page runs without that build.
        text: (await import("./citation-viewer-html.generated.js")).citationViewerHtml,
        // No `csp`: the view loads nothing from the network. Record bytes
        // come through `pipeshub_preview_record` over the host's connection.
        _meta: { ui: { prefersBorder: true } },
      }],
    }),
  );
}
