import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { PipeshubCore } from "../../core.js";
import { CiteLocation, decodeCite } from "../cite.js";
import {
  CITATION_VIEWER_DATA_KEY,
  citationViewerToolMeta,
} from "../citation-viewer.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, readJson } from "./_helpers.js";

const args = {
  citations: z.array(z.object({
    cite: z.string().min(1).max(120).describe(
      "The passage's `cite`, copied exactly from the result that gave it.",
    ),
    quote: z.string().max(500).optional().describe(
      "The passage text the answer relied on, as the result gave it.",
    ),
  })).min(1).max(30).describe(
    "The passages the answer relied on, in the order it numbers them: [1], [2], ….",
  ),
};

type RecordInfo = {
  recordName?: string;
  mimeType?: string;
  extension?: string;
  webUrl?: string;
};

/**
 * A record's name, type and link, from the metadata header a short read
 * starts with (`Name:`, `MIME Type:`, `Web URL:` lines). Empty when the read
 * fails: the citation still opens, under a generic name.
 */
async function recordInfo(
  client: PipeshubCore,
  recordId: string,
  signal: AbortSignal,
): Promise<RecordInfo> {
  const [result] = await connectorGetRecordContent(client, { recordId, maxChars: 2000 }, {
    fetchOptions: { signal },
  }).$inspect();
  if (!result.ok) return {};
  const parsed = await readJson<{ content?: string }>(result.value);
  if (!parsed.ok || typeof parsed.value?.content !== "string") return {};
  // The header ends at the first blank line; the record's own text follows.
  const header = parsed.value.content.split("\n\n")[0] ?? "";
  const field = (name: string) =>
    new RegExp(`^${name}: (.+)$`, "m").exec(header)?.[1]?.trim();
  const recordName = field("Name");
  const extension = /\.([A-Za-z0-9]{1,5})$/.exec(recordName ?? "")?.[1]?.toLowerCase();
  const webUrl = field("Web URL");
  const mimeType = field("MIME Type");
  return {
    ...(recordName ? { recordName } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(extension ? { extension } : {}),
    ...(webUrl && /^https?:\/\//.test(webUrl) ? { webUrl } : {}),
  };
}

/** One citation as a line of text: the record, where in it, and its link. */
function sourceLine(c: CiteLocation & RecordInfo & { recordName: string }): string {
  const where = c.pageNum?.length
    ? `, page ${c.pageNum[0]}`
    : c.blockNum?.length ? `, block ${c.blockNum[0]}` : "";
  return `${c.recordName}${where}${c.webUrl ? ` (${c.webUrl})` : ""}`;
}

export const tool$pipeshubShowCitations: ToolDefinition<typeof args> = {
  name: "pipeshub_show_citations",
  description:
    `Show the user your answer's sources, with document previews. Call it
once, after searching and reading and before the answer, with the \`cite\`
and \`quote\` of each passage the answer will rely on, as [1], [2], ….
It shows no answer: write the full answer after it.`,
  scopes: ["read"],
  _meta: citationViewerToolMeta,
  annotations: {
    title: "Citations",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const located: CiteLocation[] = [];
    const bad: number[] = [];
    args.citations.forEach((c, i) => {
      const loc = decodeCite(c.cite);
      if (loc) located.push(loc);
      else bad.push(i + 1);
    });
    if (bad.length > 0) {
      return errorResult(
        `Citation ${bad.join(", ")}: not a \`cite\` code. Copy each \`cite\` `
          + "exactly from the result that gave it.",
      );
    }

    const ids = [...new Set(located.map((l) => l.recordId))];
    const infos = new Map(await Promise.all(ids.map(async (id) =>
      [id, await recordInfo(client, id, ctx.signal)] as const
    )));
    const citations = located.map((loc, i) => ({
      number: i + 1,
      kind: "passage",
      ...loc,
      ...infos.get(loc.recordId),
      recordName: infos.get(loc.recordId)?.recordName ?? "Source",
      text: args.citations[i]!.quote ?? "",
    }));
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
    return {
      content: [{
        type: "text",
        // Clients without the viewer get only this text: name each source.
        text: `Shown to the user: ${plural(citations.length, "citation")} from `
          + `${plural(ids.length, "record")}, without your answer. Now write the full `
          + `answer, citing these as [1]…[${citations.length}]:\n`
          + citations.map((c) => `[${c.number}] ${sourceLine(c)}`).join("\n"),
      }],
      _meta: { [CITATION_VIEWER_DATA_KEY]: { citations } },
    };
  },
};
