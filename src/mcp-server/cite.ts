import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Cite codes: where a passage is, in one short string a model can copy.
//
// Search passages and chat citations carry one each. The model passes the
// codes of the passages its answer relied on to `pipeshub_show_citations`,
// which turns them back into the record, page, block and box the citation
// viewer opens. The code carries the location itself, so the server keeps
// nothing between calls: PipesHub's `/mcp` is stateless.
//
//   <recordId>.<page>.<block>.<sheet>.<x0>_<y0>_<x1>_<y1>[.n]
//
// Every field after the record id may be empty; the box, when present, is
// in thousandths of the page (0-999). A trailing `.n` marks a record
// PipesHub says it cannot preview (`previewRenderable: false`), so the
// viewer shows the quote and the source link instead. For example:
//   7ada7d80-62c4-425c-a125-d65a1ea3101a.1.2..144_171_906_321

export interface CiteLocation {
  recordId: string;
  pageNum?: number[];
  blockNum?: number[];
  /** 1-based. */
  sheetNum?: number;
  /** Corners in 0-1 page coordinates. */
  boundingBox?: Array<{ x: number; y: number }>;
  /** Only ever false: PipesHub cannot preview the record. */
  previewRenderable?: false;
}

const RECORD_ID = /^[A-Za-z0-9-]{1,64}$/;
const CITE = /^([A-Za-z0-9-]{1,64})\.(\d{0,6})\.(\d{0,7})\.(\d{0,4})\.(?:(\d{1,3})_(\d{1,3})_(\d{1,3})_(\d{1,3}))?(\.n)?$/;

const first = (v: unknown): number | undefined => {
  const n = Array.isArray(v) ? v[0] : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : undefined;
};
const milli = (v: number) => Math.min(999, Math.max(0, Math.round(v * 1000)));

/** The cite code of a passage, from its search or citation metadata. */
export function encodeCite(md: any): string | undefined {
  const recordId = md?.recordId;
  if (typeof recordId !== "string" || !RECORD_ID.test(recordId)) return undefined;
  const points: Array<{ x: number; y: number }> = Array.isArray(md?.bounding_box ?? md?.boundingBox)
    ? (md.bounding_box ?? md.boundingBox).filter((p: any) =>
      typeof p?.x === "number" && typeof p?.y === "number"
    )
    : [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const box = points.length > 0
    ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(milli).join("_")
    : "";
  const field = (n: number | undefined) => (n === undefined ? "" : String(n));
  return [recordId, field(first(md.pageNum)), field(first(md.blockNum)), field(first(md.sheetNum)), box]
    .join(".") + (md?.previewRenderable === false ? ".n" : "");
}

/** The location a cite code names, or undefined when it is not one. */
export function decodeCite(cite: string): CiteLocation | undefined {
  const m = CITE.exec(cite.trim());
  if (!m) return undefined;
  const [, recordId, page, block, sheet, x0s, y0s, x1s, y1s, unrenderable] = m;
  const box = [x0s, y0s, x1s, y1s];
  const loc: CiteLocation = { recordId: recordId! };
  if (page) loc.pageNum = [Number(page)];
  if (block) loc.blockNum = [Number(block)];
  if (sheet) loc.sheetNum = Number(sheet);
  if (box[0] !== undefined) {
    const [x0, y0, x1, y1] = box.map((v) => Number(v) / 1000) as [number, number, number, number];
    if (x1 < x0 || y1 < y0) return undefined;
    loc.boundingBox = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  }
  if (unrenderable) loc.previewRenderable = false;
  return loc;
}

/**
 * Said where the model is when it answers: at the end of each result it can
 * cite from. The server instructions say it too, but an agent several calls
 * in acts on what the last result told it. The card comes before the answer
 * because hosts such as Claude fold text written before a tool call into
 * the collapsed steps: only text after the last call shows as the reply.
 */
export const SHOW_CITATIONS_HINT = "Before you write your answer, call `pipeshub_show_citations` "
  + "once with the `cite` and `quote` (its text, up to 500 characters) of each passage it will rely on; "
  + "a passage without a `cite` stays out. Then write the full answer, citing them as [1], [2], ….";

/** A cite for a whole record, when what the answer relied on was a read of it. */
export const recordCite = (recordId: string) => `${recordId}....`;

/**
 * The `Cite:` line of a Slack thread read. The thread joins several records
 * (the message, each reply), and each shows its messages as numbered blocks
 * (`[0]`, `[1]`, …), so a message's cite is its record's id with that block.
 * Without this line an agent that answered from a thread had nothing to cite
 * and made codes up. Slack messages are never previewable, hence `.n`.
 */
export function threadCiteLine(recordIds: readonly string[]): string | undefined {
  const ids = [...new Set(recordIds)].filter((id) => RECORD_ID.test(id));
  if (ids.length === 0) return undefined;
  const message = (id: string, block: number | string) => `${id}..${block}...n`;
  return `Cite: message [k] of record ${ids[0]} as ${message(ids[0]!, "k")} (so [1] is ${message(ids[0]!, 1)})`
    + ids.slice(1).map((id) => `; of record ${id} as ${message(id, "k")}`).join("")
    + ". ";
}

// Record ids as PipesHub issues them: a UUID, or a 24-digit hex id.
const LOOSE_RECORD_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24})(?![0-9a-z-])/i;

/**
 * A cite as an agent passed it back, which is not always as it was given:
 * the codes are runs of dots, and agents add or drop one, wrap the code in
 * backticks, or send the record id alone. An exact code decodes as before.
 * Otherwise a code that starts with a record id stands for that whole record
 * (`exact: false`), keeping only the "not previewable" mark; the caller
 * should check the record exists, since the id may be made up too.
 */
export function decodeCiteLoosely(cite: string): { location: CiteLocation; exact: boolean } | undefined {
  // Wrappers may sit around the whole `Cite: …` or around the code after it.
  const unwrap = (x: string) => x.trim().replace(/^[`'"<[(]+|[`'">\])]+$/g, "").trim();
  const s = unwrap(unwrap(cite).replace(/^cite:\s*/i, ""));
  const exact = decodeCite(s);
  if (exact) return { location: exact, exact: true };
  const m = LOOSE_RECORD_ID.exec(s);
  if (!m) return undefined;
  const rest = s.slice(m[0].length);
  return {
    location: {
      recordId: m[1]!,
      ...(/^[.\d_]*\.n$/.test(rest) ? { previewRenderable: false as const } : {}),
    },
    exact: false,
  };
}

/**
 * A result without what only the citations card uses, for a client that
 * shows no MCP Apps views: the `cite` codes, the hint to show them, and a
 * record read's closing `Cite:` line.
 */
export function withoutCitations(result: CallToolResult): CallToolResult {
  const { structuredContent } = result;
  return {
    ...result,
    content: result.content.map((c) => c.type === "text" ? { ...c, text: textWithoutCitations(c.text) } : c),
    // A read's structured form repeats its text, which must lose the same lines.
    ...(structuredContent && typeof structuredContent["text"] === "string"
      ? { structuredContent: { ...structuredContent, text: textWithoutCitations(structuredContent["text"]) } }
      : {}),
  };
}

function textWithoutCitations(text: string): string {
  const citeLine = text.lastIndexOf("\nCite: ");
  if (citeLine >= 0 && text.endsWith(SHOW_CITATIONS_HINT)) return text.slice(0, citeLine);
  if (!text.startsWith("{")) return text;
  try {
    return JSON.stringify(JSON.parse(text), (key, value) =>
      key === "cite" || (key === "next" && value === SHOW_CITATIONS_HINT) ? undefined : value);
  } catch {
    return text;
  }
}
