// The citation viewer: an MCP Apps view (https://modelcontextprotocol.io/
// extensions/apps) that hosts such as Claude show with a
// `pipeshub_show_citations` result, which the model calls after its answer.
// It lists the passages the answer relied on; opening one shows the cited
// record with the passage highlighted, as PipesHub's own chat does. Hosts
// without MCP Apps ignore all of this and see the usual text.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { citationViewerHtml } from "./citation-viewer-html.generated.js";

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
        text: citationViewerHtml,
        // No `csp`: the view loads nothing from the network. Record bytes
        // come through `pipeshub_preview_record` over the host's connection.
        _meta: { ui: { prefersBorder: true } },
      }],
    }),
  );
}
