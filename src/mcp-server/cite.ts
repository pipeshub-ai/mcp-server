import type { CallToolResult } from "@modelcontextprotocol/server";

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
export function threadCiteLine(recordIds: readonly string[], content = ""): string | undefined {
  const ids = [...new Set(recordIds)].filter((id) => RECORD_ID.test(id));
  if (ids.length === 0) return undefined;
  // Each message's own code, spelled out: given `R..k...n` to fill in, agents
  // replaced the closing letter n with the number too (`R..1...1`), which
  // loses the message. A thread longer than the cap names the rule instead.
  const blocks = threadMessageBlocks(content);
  let listed = 0;
  const parts = ids.map((id) => {
    const nums = blocks.get(id) ?? [];
    if (nums.length > 0 && listed + nums.length <= MAX_LISTED_THREAD_CITES) {
      listed += nums.length;
      return `record ${id}: ${nums.map((k) => `[${k}] ${threadCite(id, k)}`).join(", ")}`;
    }
    return `record ${id}: message [k] is ${threadCite(id, "k")} with the number for k and the letter n kept last`
      + ` (so [0] is ${threadCite(id, 0)})`;
  });
  return `Cite: each message by its own code, copied whole (it ends in the letter n): ${parts.join("; ")}. `;
}

/** Codes a thread's `Cite:` line spells out before it names the rule instead. */
const MAX_LISTED_THREAD_CITES = 60;

const threadCite = (id: string, block: number | string) => `${id}..${block}...n`;

/**
 * The numbered messages (`[0]`, `[1]`, …) of each record in a thread read's
 * text, by record id: each record opens with a `Record ID:` line and shows
 * its messages as numbered blocks.
 */
function threadMessageBlocks(content: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const heads = [...content.matchAll(/^Record ID: (\S+)/gm)];
  heads.forEach((h, i) => {
    const body = content.slice(h.index!, heads[i + 1]?.index ?? content.length);
    const nums = [...new Set([...body.matchAll(/^\[(\d{1,7})\] /gm)].map((m) => Number(m[1])))];
    if (nums.length > 0) out.set(h[1]!, [...(out.get(h[1]!) ?? []), ...nums]);
  });
  return out;
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
  // A thread message's code with its closing `n` turned into a number
  // (`R..1...1`): agents filled in both letters of `R..k...n`. The message
  // is the first number, and a Slack message is never previewable.
  const misread = /^\.\.(\d{1,7})\.\.\.\d{1,7}$/.exec(rest);
  if (misread) {
    return {
      location: { recordId: m[1]!, blockNum: [Number(misread[1])], previewRenderable: false },
      exact: false,
    };
  }
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
  const structured = structuredContent && typeof structuredContent === "object" && !Array.isArray(structuredContent)
    ? structuredContent as Record<string, unknown>
    : undefined;
  return {
    ...result,
    content: result.content.map((c) => c.type === "text" ? { ...c, text: textWithoutCitations(c.text) } : c),
    // A read's structured form repeats its text, which must lose the same lines.
    ...(structured && typeof structured["text"] === "string"
      ? { structuredContent: { ...structured, text: textWithoutCitations(structured["text"]) } }
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
