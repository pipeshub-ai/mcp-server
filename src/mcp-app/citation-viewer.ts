// Browser code of the citation viewer (see src/mcp-server/citation-viewer.ts).
// `npm run build` bundles it with pdf.js into one HTML page.

import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import * as pdfjs from "pdfjs-dist";
import * as XLSX from "xlsx";
import * as docx from "docx-preview";
import DOMPurify from "dompurify";
// The view's sandbox may not allow a worker, so pdf.js runs on the main
// thread: it uses the worker module found on `globalThis.pdfjsWorker`.
import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

(globalThis as any).pdfjsWorker = pdfjsWorker;

type Point = { x: number; y: number };
type Citation = {
  number: number;
  kind?: string;
  recordId?: string;
  recordName?: string;
  webUrl?: string;
  mimeType?: string;
  extension?: string;
  pageNum?: number[];
  blockNum?: number[];
  boundingBox?: Point[];
  sheetName?: string;
  /** 1-based. */
  sheetNum?: number;
  /** False when PipesHub cannot preview the record: show the quote and source link. */
  previewRenderable?: boolean;
  text: string;
};

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const app = new App(
  { name: "PipesHub citations", version: "1.0.0" },
  { availableDisplayModes: ["inline", "fullscreen"] },
);

let citations: Citation[] = [];

// ─── Citations card ──────────────────────────────────────────────────────────
// Claude writes the answer from the tool's text; the card adds only what
// text cannot: each citation, to open in its record.

function showCitations() {
  $("status").textContent = "PipesHub cited no sources for this answer.";
  $("status").classList.toggle("hidden", citations.length > 0);
  $("citations").replaceChildren(...citations.map((c) => {
    const row = el("button", "row");
    row.dataset["cite"] = String(c.number);
    row.append(
      el("div", "sub", `${c.number} · ${c.recordName ?? "Untitled"}`),
      el("div", undefined, c.text.length > 220 ? `${c.text.slice(0, 220)}…` : c.text),
    );
    return row;
  }));
}

document.addEventListener("click", (e) => {
  const cite = (e.target as HTMLElement).closest<HTMLElement>("[data-cite]");
  if (cite && !cite.closest("#preview")) {
    const c = citations.find((x) => x.number === Number(cite.dataset["cite"]));
    if (c) void openPreview(c);
  }
});

// ─── Record preview ──────────────────────────────────────────────────────────

const files = new Map<string, Promise<{ bytes: Uint8Array; mimeType: string }>>();

/** The record's file, in slices from the app-only preview tool. */
function loadFile(recordId: string) {
  let file = files.get(recordId);
  if (!file) {
    file = (async () => {
      const parts: Uint8Array[] = [];
      let offset: number | undefined = 0;
      let mimeType = "";
      while (offset !== undefined) {
        const res = await app.callServerTool({
          name: "pipeshub_preview_record",
          arguments: { recordId, offset },
        });
        const sc = res.structuredContent as any;
        if (res.isError || !sc) {
          const msg = (res.content?.[0] as any)?.text;
          throw new Error(msg || "Could not load the record.");
        }
        parts.push(Uint8Array.from(atob(sc.bytes), (ch) => ch.charCodeAt(0)));
        mimeType = sc.mimeType;
        offset = sc.nextOffset;
      }
      const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let at = 0;
      for (const p of parts) {
        bytes.set(p, at);
        at += p.length;
      }
      return { bytes, mimeType };
    })();
    files.set(recordId, file);
    file.catch(() => files.delete(recordId));
  }
  return file;
}

let displayMode: string = "inline";
/** How the open record is shown: drawn pages, a spreadsheet, or the cited text. */
let docKind: "pdf" | "sheet" | "docx" | "text" = "text";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const SHEET_EXTENSIONS = new Set(["xlsx", "xlsm", "xls", "xlsb", "ods", "csv", "tsv"]);
const isCsv = (c: Citation) =>
  c.extension === "csv" || c.mimeType === "text/csv" || c.mimeType === "application/csv";

function kindOf(c: Citation): typeof docKind {
  if (c.mimeType === "application/pdf" || c.extension === "pdf") return "pdf";
  if (c.extension === "docx" || c.mimeType === DOCX_MIME) return "docx";
  const mime = c.mimeType ?? "";
  if (SHEET_EXTENSIONS.has(c.extension ?? "") || isCsv(c)
    || mime.includes("spreadsheet") || mime.includes("ms-excel")) return "sheet";
  return "text";
}
let previewToken = 0;
let pageEls: HTMLElement[] = [];

async function setDisplayMode(mode: "inline" | "fullscreen") {
  if (!app.getHostContext()?.availableDisplayModes?.includes(mode)) return;
  try {
    displayMode = (await app.requestDisplayMode({ mode })).mode;
  } catch {
    // The host keeps its mode; the preview still works inline.
  }
}

async function openPreview(c: Citation) {
  const token = ++previewToken;
  const sameRecord = citations.filter((x) =>
    x.recordId ? x.recordId === c.recordId : x === c
  );
  $("card").classList.add("hidden");
  $("preview").classList.remove("hidden");
  $("p-title").textContent = c.recordName ?? "Source";
  const link = /^https?:\/\//.test(c.webUrl ?? "") ? c.webUrl : undefined;
  $("p-open").classList.toggle("hidden", !link);
  $("p-open").onclick = () => link && app.openLink({ url: link });
  renderSide(sameRecord, c);
  await setDisplayMode("fullscreen");
  $("preview").classList.toggle("inline", displayMode !== "fullscreen");

  const pages = $("pages");
  pages.replaceChildren(el("div", "status", "Loading document…"));
  pageEls = [];
  docKind = kindOf(c);
  $("zoom").classList.toggle("hidden", docKind !== "pdf");
  // Like PipesHub's own preview: a record it cannot render (a page or
  // message in an external app, not a file) opens as its quote, with Open.
  if (!c.recordId || docKind === "text" || c.previewRenderable === false) {
    showText(c);
    return;
  }
  try {
    const { bytes, mimeType } = await loadFile(c.recordId);
    if (token !== previewToken) return;
    // What the file is, when its type says so: PipesHub may store a Word
    // upload as the PDF it converted it to.
    const stored = kindOf({ number: c.number, text: "", mimeType });
    if (stored !== "text") docKind = stored;
    $("zoom").classList.toggle("hidden", docKind !== "pdf");
    if (docKind === "pdf") await renderPdf(bytes.slice(), sameRecord, token);
    else if (docKind === "sheet") {
      renderWorkbook(bytes, c);
      // Row tags are worth showing once the rows can be checked against the quotes.
      renderSide(sameRecord, c);
    }
    else await renderDocx(bytes, token);
    if (token === previewToken) focusCitation(c);
  } catch (err) {
    if (token !== previewToken) return;
    // The source may not hand the file over (an external app's page, a
    // native Google doc): show what was cited rather than an error.
    showText(c);
    $("pages").prepend(el("div", "status", `No preview for this file (${(err as Error).message}). The cited text:`));
  }
}

/** A record pdf.js cannot show: its cited text, marked. */
function showText(c: Citation) {
  $("zoom").classList.add("hidden");
  const doc = el("div", "text-doc");
  doc.append(el("mark", undefined, c.text));
  $("pages").replaceChildren(doc);
}

function closePreview() {
  previewToken++;
  $("preview").classList.add("hidden");
  $("card").classList.remove("hidden");
  $("pages").replaceChildren();
  void setDisplayMode("inline");
}
$("p-close").onclick = closePreview;

function renderSide(list: Citation[], active: Citation) {
  $("p-cites").replaceChildren(...list.map((c) => {
    const card = el("div", "cite" + (c === active ? " active" : ""));
    card.dataset["n"] = String(c.number);
    const quote = el("div", "quote", c.text);
    const more = el("button", "more" + (c.text.length > 200 ? "" : " hidden"), "Show more");
    more.onclick = (e) => {
      e.stopPropagation();
      more.textContent = card.classList.toggle("open") ? "Show less" : "Show more";
    };
    const tags = el("div", "tags");
    if (c.pageNum?.length) tags.append(el("span", "tag", `Page ${c.pageNum.join(", ")}`));
    if (c.sheetName) tags.append(el("span", "tag", c.sheetName));
    if (c.blockNum?.length) {
      tags.append(el("span", "tag", kindOf(c) === "sheet"
        ? `Row ${citedRow(c)}`
        : `Paragraph ${c.blockNum.join(", ")}`));
    }
    card.append(el("div", "label", `Citation ${c.number}`), quote, more, tags);
    card.onclick = () => {
      for (const x of document.querySelectorAll(".cite")) x.classList.toggle("active", x === card);
      focusCitation(c);
    };
    return card;
  }));
}

// The open PDF: its page shapes, and what draws a page as it scrolls in.
let aspects: number[] = [];
let drawPages: IntersectionObserver | null = null;
/** 1 fits the page to the pane's width. */
let zoom = 1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

async function renderPdf(bytes: Uint8Array, list: Citation[], token: number) {
  const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  if (token !== previewToken) return;
  const pages = $("pages");
  drawPages?.disconnect();
  drawPages = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      drawPages?.unobserve(entry.target);
      void drawPage(pdf, entry.target as HTMLElement);
    }
  }, { root: pages, rootMargin: "800px 0px" });

  const boxes: HTMLElement[] = [];
  const shapes: number[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const vp = (await pdf.getPage(n)).getViewport({ scale: 1 });
    if (token !== previewToken) return;
    const box = el("div", "page");
    box.dataset["page"] = String(n);
    for (const c of list) {
      if (c.pageNum?.[0] === n && c.boundingBox) box.append(highlight(c));
    }
    boxes.push(box);
    shapes.push(vp.height / vp.width);
  }
  pages.replaceChildren(...boxes);
  pageEls = boxes;
  aspects = shapes;
  zoom = 1;
  layoutPages();
}

/**
 * Sizes every page to the pane's width times `zoom`, keeping the reader's
 * place, and redraws pages as they come into view. Runs again when the host
 * resizes the view: it may still be growing into fullscreen on first layout.
 */
function layoutPages() {
  const pages = $("pages");
  if (pageEls.length === 0 || pages.clientWidth === 0) return;
  const place = pages.scrollTop / Math.max(1, pages.scrollHeight);
  const width = Math.round(Math.min(pages.clientWidth - 32, 1000) * zoom);
  pageEls.forEach((box, i) => {
    box.style.width = `${width}px`;
    box.style.height = `${width * aspects[i]!}px`;
    box.querySelector("canvas")?.remove();
    drawPages?.observe(box);
  });
  pages.scrollTop = place * pages.scrollHeight;
  $("z-level").textContent = `${Math.round(zoom * 100)}%`;
}

function setZoom(next: number) {
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 4) / 4));
  layoutPages();
}
$("z-in").onclick = () => setZoom(zoom + 0.25);
$("z-out").onclick = () => setZoom(zoom - 0.25);
$("z-fit").onclick = () => setZoom(1);

let relayout: ReturnType<typeof setTimeout> | undefined;
window.addEventListener("resize", () => {
  clearTimeout(relayout);
  relayout = setTimeout(layoutPages, 150);
});

async function drawPage(pdf: pdfjs.PDFDocumentProxy, box: HTMLElement) {
  const page = await pdf.getPage(Number(box.dataset["page"]));
  // A layout during the await may have queued this page again.
  if (box.querySelector("canvas")) return;
  const ratio = window.devicePixelRatio || 1;
  const vp = page.getViewport({ scale: (box.clientWidth * ratio) / page.getViewport({ scale: 1 }).width });
  const canvas = el("canvas");
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  box.prepend(canvas);
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
}

// ─── Spreadsheets ────────────────────────────────────────────────────────────
// As PipesHub's own preview does: the cited row is the citation's block
// number, 1-based like Excel rows, except CSV's, which are 0-based.

let workbook: XLSX.WorkBook | null = null;
/** The record `workbook` was read from. */
let workbookRecord: string | undefined;
let sheetShown = "";
/** Rows drawn per sheet; a cited row past it is still opened, alone. */
const SHEET_MAX_ROWS = 2000;
const SHEET_MAX_COLS = 60;

function renderWorkbook(bytes: Uint8Array, c: Citation) {
  workbookRecord = c.recordId;
  workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellFormula: false, cellHTML: false, cellStyles: false });
  sheetShown = "";
  showSheet(sheetFor(c));
}

/** The row the citation's block number names, by PipesHub's own preview rule. */
function blockRow(c: Citation): number | undefined {
  const block = c.blockNum?.[0];
  return block === undefined ? undefined : block + (isCsv(c) ? 1 : 0);
}

/** How much of a row's text the quote contains: longer cells (an email, a name) weigh more. */
function rowMatch(ws: XLSX.WorkSheet, row: number, quote: string): number {
  const ref = ws["!ref"];
  if (!ref || row < 1) return -1;
  const range = XLSX.utils.decode_range(ref);
  let score = 0;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = ws[XLSX.utils.encode_cell({ r: row - 1, c: col })];
    const v = cell ? XLSX.utils.format_cell(cell).trim().toLowerCase() : "";
    if (v.length >= 2 && quote.includes(v)) score += v.length;
  }
  return score;
}

/** Rows checked against a quote; a sheet past it falls back to the block's row. */
const MATCH_MAX_ROWS = 5000;

/**
 * The cited row. PipesHub's block numbers are not numbered the same way
 * everywhere (the Excel row on one instance, a row or two before it on
 * another), so every row is checked against the quote and the one that
 * matches most of it wins, the nearest to the block's row on a tie. With no
 * quote, or nothing in it matching, the block's row stands.
 */
function citedRow(c: Citation): number | undefined {
  const base = blockRow(c);
  const quote = c.text.toLowerCase();
  if (base === undefined || !workbook || workbookRecord !== c.recordId || !quote) return base;
  const ws = workbook.Sheets[sheetFor(c)];
  const ref = ws?.["!ref"];
  if (!ws || !ref) return base;
  const range = XLSX.utils.decode_range(ref);
  let best = base;
  let bestScore = 0;
  const last = Math.min(range.e.r + 1, range.s.r + MATCH_MAX_ROWS);
  for (let row = range.s.r + 1; row <= last; row++) {
    const score = rowMatch(ws, row, quote);
    if (score > bestScore || (score === bestScore && score > 0 && Math.abs(row - base) < Math.abs(best - base))) {
      [best, bestScore] = [row, score];
    }
  }
  return best;
}

/** The citation's sheet: the one it names or numbers, else the first holding its row. */
function sheetFor(c: Citation): string {
  const names = workbook!.SheetNames;
  if (c.sheetName && names.includes(c.sheetName)) return c.sheetName;
  if (c.sheetNum && names[c.sheetNum - 1]) return names[c.sheetNum - 1]!;
  const row = blockRow(c);
  const holds = (name: string) => {
    const ref = workbook!.Sheets[name]?.["!ref"];
    return ref !== undefined && row !== undefined && row <= XLSX.utils.decode_range(ref).e.r + 1;
  };
  return (holds(sheetShown) ? sheetShown : names.find(holds)) ?? names[0]!;
}

function showSheet(name: string) {
  if (name === sheetShown) return;
  sheetShown = name;
  const ws = workbook!.Sheets[name]!;
  const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
  const tabs = el("div", "sheet-tabs");
  if (workbook!.SheetNames.length > 1) {
    tabs.append(...workbook!.SheetNames.map((n) => {
      const t = el("button", "sheet-tab" + (n === name ? " active" : ""), n);
      t.onclick = () => showSheet(n);
      return t;
    }));
  }
  const table = el("table", "sheet");
  if (range) {
    const lastCol = Math.min(range.e.c, range.s.c + SHEET_MAX_COLS - 1);
    const head = el("tr");
    head.append(el("th", "rn"));
    for (let col = range.s.c; col <= lastCol; col++) head.append(el("th", undefined, XLSX.utils.encode_col(col)));
    table.append(head);
    const lastRow = Math.min(range.e.r, range.s.r + SHEET_MAX_ROWS - 1);
    for (let r = range.s.r; r <= lastRow; r++) {
      const tr = el("tr");
      tr.dataset["row"] = String(r + 1);
      tr.append(el("td", "rn", String(r + 1)));
      for (let col = range.s.c; col <= lastCol; col++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
        tr.append(el("td", undefined, cell ? XLSX.utils.format_cell(cell) : ""));
      }
      table.append(tr);
    }
  }
  const wrap = el("div", "sheet-wrap");
  wrap.append(table);
  $("pages").replaceChildren(tabs, wrap);
}

function focusRow(c: Citation) {
  if (!workbook) return;
  showSheet(sheetFor(c));
  for (const x of document.querySelectorAll(".hl-row")) x.classList.remove("hl-row", "flash");
  const row = citedRow(c);
  const tr = row === undefined ? null : document.querySelector<HTMLElement>(`tr[data-row="${row}"]`);
  if (!tr) return;
  tr.classList.add("hl-row", "flash");
  tr.scrollIntoView({ block: "center", behavior: "smooth" });
}

// ─── Word documents ──────────────────────────────────────────────────────────
// As PipesHub's own preview does: docx-preview draws the document, and the
// cited passage is found by its text, since a .docx has no page coordinates.

// Same options as PipesHub's preview. renderAltChunks stays off: it puts the
// document's embedded HTML in an unsandboxed frame.
const DOCX_OPTIONS = {
  className: "docx", inWrapper: true, ignoreWidth: true, ignoreHeight: false,
  breakPages: true, ignoreLastRenderedPageBreak: true, useBase64URL: true,
  renderChanges: false, renderComments: false, renderAltChunks: false,
};
const SYMBOL_CHAR = /^[0-9a-fA-F]{1,6}$/;

/**
 * docx-preview writes a `<w:sym w:char>` value into innerHTML unescaped, so a
 * crafted document could run script, which here could call PipesHub tools.
 * Any symbol that is not a hex code point is replaced first (as PipesHub does).
 */
function neutralizeSymbols(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  const node = value as Record<string, unknown>;
  if (node["type"] === "symbol" && !(typeof node["char"] === "string" && SYMBOL_CHAR.test(node["char"]))) {
    node["char"] = "FFFD";
  }
  for (const [key, child] of Object.entries(node)) {
    if (key !== "parent") neutralizeSymbols(child, seen);
  }
}

async function renderDocx(bytes: Uint8Array, token: number) {
  const parsed = await docx.parseAsync(bytes, DOCX_OPTIONS);
  neutralizeSymbols((parsed as any).parts);
  const holder = el("div");
  holder.append(...await docx.renderDocument(parsed, DOCX_OPTIONS));
  if (token !== previewToken) return;
  const page = el("div", "docx-page");
  // Sanitized like PipesHub's preview: the document is untrusted markup.
  page.innerHTML = DOMPurify.sanitize(holder.innerHTML, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    ADD_TAGS: ["style"],
    FORCE_BODY: true,
    FORBID_TAGS: ["script", "link", "base", "meta", "form", "input", "button", "textarea", "iframe", "object", "embed"],
  });
  $("pages").replaceChildren(page);
}

const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 2));

/** The block holding the cited text, else the most similar one (PipesHub's 0.55 word overlap). */
function focusPassage(c: Citation) {
  for (const x of document.querySelectorAll(".hl-block")) x.classList.remove("hl-block", "flash");
  const want = c.text.replace(/\s+/g, " ").trim().toLowerCase();
  if (want.length < 3) return;
  const blocks = [...document.querySelectorAll<HTMLElement>(".docx-page :is(p, li, td, th, h1, h2, h3, h4, h5, h6)")];
  const textOf = (b: HTMLElement) => (b.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  let hit = blocks.find((b) => textOf(b).includes(want));
  if (!hit) {
    const target = words(want);
    let best = 0.55;
    for (const b of blocks) {
      const have = words(textOf(b));
      const shared = [...target].filter((w) => have.has(w)).length;
      const score = shared / (target.size + have.size - shared || 1);
      if (score > best) [best, hit] = [score, b];
    }
  }
  if (!hit) return;
  hit.classList.add("hl-block", "flash");
  hit.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** The cited region: the bounding box's extent, in page percentages. */
function highlight(c: Citation) {
  const xs = c.boundingBox!.map((p) => p.x);
  const ys = c.boundingBox!.map((p) => p.y);
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
  const hl = el("div", "hl");
  hl.dataset["n"] = String(c.number);
  hl.style.left = pct(Math.min(...xs));
  hl.style.top = pct(Math.min(...ys));
  hl.style.width = pct(Math.max(...xs) - Math.min(...xs));
  hl.style.height = pct(Math.max(...ys) - Math.min(...ys));
  return hl;
}

function focusCitation(c: Citation) {
  if (docKind === "sheet") return focusRow(c);
  if (docKind === "docx") return focusPassage(c);
  const page = pageEls[(c.pageNum?.[0] ?? 1) - 1];
  if (!page) return;
  // Only the open citation is marked: citations of one table share its box.
  for (const x of document.querySelectorAll<HTMLElement>(".hl")) {
    x.classList.toggle("hidden", x.dataset["n"] !== String(c.number));
  }
  const hl = page.querySelector<HTMLElement>(`.hl[data-n="${c.number}"]`);
  const pages = $("pages");
  const top = page.offsetTop - pages.offsetTop
    + (hl ? hl.offsetTop - pages.clientHeight / 3 : 0);
  pages.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  if (hl) {
    hl.classList.remove("flash");
    void hl.offsetWidth;
    hl.classList.add("flash");
  }
}

// ─── Host wiring ─────────────────────────────────────────────────────────────

function applyHostContext(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.displayMode) displayMode = ctx.displayMode;
}

app.ontoolresult = (result) => {
  // `pipeshub_show_citations` puts the citations in `_meta`, which hosts keep
  // out of the model's context; its text is a one-line summary.
  const fromMeta = (result._meta as any)?.["pipeshub/citations"]?.citations;
  if (result.isError || !Array.isArray(fromMeta)) {
    const text = (result.content?.find((c) => c.type === "text") as any)?.text;
    $("status").textContent = text || "PipesHub sent no citations to show.";
    $("status").classList.add("error");
    return;
  }
  citations = fromMeta;
  showCitations();
};

app.ontoolcancelled = () => {
  $("status").textContent = "Cancelled.";
};

app.onhostcontextchanged = applyHostContext;

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) applyHostContext(ctx);
}).catch((err: unknown) => {
  $("status").textContent = `Could not connect to the host: ${(err as Error).message}`;
});
