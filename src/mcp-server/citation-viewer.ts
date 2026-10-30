// The citation viewer: an MCP Apps view (https://modelcontextprotocol.io/
// extensions/apps) that hosts such as Claude show with a `pipeshub_chat`
// result. It renders the answer with its [N] citations; opening one shows the
// cited record with the cited passage highlighted, as PipesHub's own chat
// does. Hosts without MCP Apps ignore all of this and see the usual text.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { citationViewerHtml } from "./citation-viewer-html.generated.js";
import { lastBotMessage, readCitations } from "./tools/_helpers.js";

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

/** Longest cited text the viewer gets per citation. */
const VIEWER_TEXT_MAX_CHARS = 4000;

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

const numbers = (v: unknown): number[] | undefined =>
  Array.isArray(v) && v.every((n) => typeof n === "number") ? v : undefined;

/** One corner list in 0-1 page coordinates, or undefined. */
function boundingBox(v: unknown): Array<{ x: number; y: number }> | undefined {
  if (!Array.isArray(v)) return undefined;
  const points = v.filter((p) =>
    typeof p?.x === "number" && typeof p?.y === "number"
  ).map((p) => ({ x: p.x as number, y: p.y as number }));
  return points.length > 0 ? points : undefined;
}

/**
 * What the viewer needs to open each citation of the conversation's latest
 * answer at the cited spot. It goes in the result's `_meta`, which hosts keep
 * out of the model's context, so the model-facing text stays as it was.
 */
export function citationViewerData(conv: any) {
  const cited = lastBotMessage(conv)?.citations;
  const raw: any[] = Array.isArray(cited) ? cited : [];
  const read = readCitations(raw);
  return {
    citations: read.map((c, i) => {
      const md = raw[i]?.citationData?.metadata ?? raw[i]?.metadata ?? {};
      return {
        number: c.number,
        kind: c.kind,
        recordId: typeof c.recordId === "string" ? c.recordId : undefined,
        recordName: c.recordName,
        webUrl: c.webUrl,
        mimeType: typeof c.mimeType === "string" ? c.mimeType : undefined,
        extension: typeof md.extension === "string" ? md.extension : undefined,
        connector: typeof md.connector === "string" ? md.connector : undefined,
        pageNum: numbers(md.pageNum),
        blockNum: numbers(md.blockNum),
        boundingBox: boundingBox(md.bounding_box ?? md.boundingBox),
        sheetName: typeof md.sheetName === "string" ? md.sheetName : undefined,
        sheetNum: typeof md.sheetNum === "number" ? md.sheetNum : undefined,
        text: c.text.slice(0, VIEWER_TEXT_MAX_CHARS),
      };
    }),
  };
}
