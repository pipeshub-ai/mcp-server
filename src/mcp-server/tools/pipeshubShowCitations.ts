import * as z from "zod";
import { connectorGetRecordContent } from "../../funcs/connectorGetRecordContent.js";
import { headerField } from "./pipeshubGetRecordContent.js";
import { PipeshubCore } from "../../core.js";
import { CiteLocation, decodeCiteLoosely } from "../cite.js";
import {
  CITATION_VIEWER_DATA_KEY,
  citationViewerToolMeta,
} from "../citation-viewer.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, readJson } from "./_helpers.js";

const args = {
  citations: z.array(z.object({
    // Room for what agents send by mistake (a link, a padded code): such a
    // cite is skipped or read loosely, not a refused call.
    cite: z.string().min(1).max(300).describe(
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
  connector?: string;
  webUrl?: string;
};

/**
 * A record's name, type and link, from the metadata header a short read
 * starts with (`Name:`, `Connector:`, `MIME Type:`, `Web URL:` lines). Empty when the read
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
  const content = parsed.value.content;
  const field = (name: string) => headerField(content, name);
  const recordName = field("Name");
  const extension = /\.([A-Za-z0-9]{1,5})$/.exec(recordName ?? "")?.[1]?.toLowerCase();
  const webUrl = field("Web URL");
  const mimeType = field("MIME Type");
  const connector = field("Connector");
  return {
    ...(recordName ? { recordName } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(connector ? { connector } : {}),
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
    // Each citation the agent sent, read as exactly as it allows. One it got
    // wrong costs that citation, not the card: the others still show.
    const decoded = args.citations.map((c) => decodeCiteLoosely(c.cite));
    const ids = [...new Set(decoded.flatMap((d) => (d ? [d.location.recordId] : [])))];
    const infos = new Map(await Promise.all(ids.map(async (id) =>
      [id, await recordInfo(client, id, ctx.signal)] as const
    )));
    const kept: Array<{ location: CiteLocation; quote: string }> = [];
    const skipped: number[] = [];
    decoded.forEach((d, i) => {
      // A loosely read cite names only a record id, which may be made up:
      // it stays only when that record could be read.
      if (d && (d.exact || infos.get(d.location.recordId)?.recordName !== undefined)) {
        kept.push({ location: d.location, quote: args.citations[i]!.quote ?? "" });
      } else {
        skipped.push(i + 1);
      }
    });
    if (kept.length === 0) {
      return errorResult(
        `Citation ${skipped.join(", ")}: not a \`cite\` code. Copy each \`cite\` `
          + "exactly from the result that gave it: a search passage's `cite`, or the "
          + "`Cite:` line that ends a record or thread read.",
      );
    }

    const citations = kept.map(({ location, quote }, i) => ({
      number: i + 1,
      kind: "passage",
      ...location,
      ...infos.get(location.recordId),
      recordName: infos.get(location.recordId)?.recordName ?? "Source",
      text: quote,
    }));
    const records = new Set(kept.map((k) => k.location.recordId)).size;
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
    return {
      content: [{
        type: "text",
        // Clients without the viewer get only this text: name each source.
        text: `Shown to the user: ${plural(citations.length, "citation")} from `
          + `${plural(records, "record")}, without your answer. Now write the full `
          + `answer, citing these as [1]…[${citations.length}]:\n`
          + citations.map((c) => `[${c.number}] ${sourceLine(c)}`).join("\n")
          + (skipped.length > 0
            ? `\nNot shown: your citation ${skipped.join(", ")}, not a \`cite\` from a result. `
              + "Number the answer's citations as listed above."
            : ""),
      }],
      _meta: { [CITATION_VIEWER_DATA_KEY]: { citations } },
    };
  },
};
