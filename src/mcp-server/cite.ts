// Cite codes: where a passage is, in one short string a model can copy.
//
// Search passages and chat citations carry one each. The model passes the
// codes of the passages its answer relied on to `pipeshub_show_citations`,
// which turns them back into the record, page, block and box the citation
// viewer opens. The code carries the location itself, so the server keeps
// nothing between calls: PipesHub's `/mcp` is stateless.
//
//   <recordId>.<page>.<block>.<sheet>.<x0>_<y0>_<x1>_<y1>
//
// Every field after the record id may be empty; the box, when present, is
// in thousandths of the page (0-999). For example:
//   7ada7d80-62c4-425c-a125-d65a1ea3101a.1.2..144_171_906_321

export interface CiteLocation {
  recordId: string;
  pageNum?: number[];
  blockNum?: number[];
  /** 1-based. */
  sheetNum?: number;
  /** Corners in 0-1 page coordinates. */
  boundingBox?: Array<{ x: number; y: number }>;
}

const RECORD_ID = /^[A-Za-z0-9-]{1,64}$/;
const CITE = /^([A-Za-z0-9-]{1,64})\.(\d{0,6})\.(\d{0,7})\.(\d{0,4})\.(?:(\d{1,3})_(\d{1,3})_(\d{1,3})_(\d{1,3}))?$/;

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
    .join(".");
}

/** The location a cite code names, or undefined when it is not one. */
export function decodeCite(cite: string): CiteLocation | undefined {
  const m = CITE.exec(cite.trim());
  if (!m) return undefined;
  const [, recordId, page, block, sheet, ...box] = m;
  const loc: CiteLocation = { recordId: recordId! };
  if (page) loc.pageNum = [Number(page)];
  if (block) loc.blockNum = [Number(block)];
  if (sheet) loc.sheetNum = Number(sheet);
  if (box[0] !== undefined) {
    const [x0, y0, x1, y1] = box.map((v) => Number(v) / 1000) as [number, number, number, number];
    if (x1 < x0 || y1 < y0) return undefined;
    loc.boundingBox = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  }
  return loc;
}
