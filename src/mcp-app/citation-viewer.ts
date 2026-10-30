// Browser code of the citation viewer (see src/mcp-server/citation-viewer.ts).
// `npm run build` bundles it with pdf.js into one HTML page.

import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import * as pdfjs from "pdfjs-dist";
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
/** The link each [N] marker of the answer carries: absolute, unlike an uploaded record's `webUrl`. */
const answerLinks = new Map<number, string>();

// ─── Answer card ─────────────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Inline markdown of one escaped line, citation markers → chips. */
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[(\d+)\]\([^)\s]*\)/g, (_m, n) => chip(Number(n)));
}

function chip(n: number): string {
  const c = citations.find((x) => x.number === n);
  const name = escapeHtml(c?.recordName ?? `Source ${n}`);
  return `<button class="chip" data-cite="${n}" title="${name}">`
    + `<span class="doc-icon"></span><span class="name">${name}</span>`
    + `<span class="num">${n}</span></button>`;
}

/** The answer's markdown: paragraphs, lists, headings, bold, code. */
function renderMarkdown(md: string): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of escapeHtml(md).split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)/.exec(line);
    const heading = /^#{1,6}\s+(.*)/.exec(line);
    if (bullet || ordered) {
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) {
        close();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? ordered)![1]!)}</li>`);
    } else {
      close();
      if (heading) out.push(`<h4>${inline(heading[1]!)}</h4>`);
      else if (line) out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join("");
}

/** Records in the order the answer first cites them. */
function sources() {
  const byId = new Map<string, Citation[]>();
  for (const c of citations) {
    const key = c.recordId ?? c.webUrl ?? String(c.number);
    byId.set(key, [...(byId.get(key) ?? []), c]);
  }
  return [...byId.values()];
}

function showAnswer(answer: string) {
  $("status").classList.add("hidden");
  $("body").classList.remove("hidden");
  $("tab-text").innerHTML = renderMarkdown(answer);

  const recs = sources();
  $("n-sources").textContent = String(recs.length);
  $("n-citations").textContent = String(citations.length);

  const srcList = $("tab-sources");
  srcList.replaceChildren(...recs.map((cs) => {
    const first = cs[0]!;
    const row = el("button", "row");
    row.dataset["cite"] = String(first.number);
    const info = el("div");
    info.append(
      el("div", "title", first.recordName ?? "Untitled"),
      el("div", "sub", `${cs.length} citation${cs.length > 1 ? "s" : ""}`
        + (first.extension ? ` · ${first.extension.toUpperCase()}` : "")),
    );
    row.append(el("span", "doc-icon"), info);
    return row;
  }));

  $("tab-citations").replaceChildren(...citations.map((c) => {
    const row = el("button", "row");
    row.dataset["cite"] = String(c.number);
    const info = el("div");
    info.append(
      el("div", "sub", `${c.number} · ${c.recordName ?? ""}`),
      el("div", undefined, c.text.length > 220 ? `${c.text.slice(0, 220)}…` : c.text),
    );
    row.append(info);
    return row;
  }));
}

document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const tab = target.closest<HTMLElement>(".tab");
  if (tab) {
    for (const t of document.querySelectorAll(".tab")) {
      t.classList.toggle("active", t === tab);
    }
    for (const name of ["text", "sources", "citations"]) {
      $(`tab-${name}`).classList.toggle("hidden", name !== tab.dataset["tab"]);
    }
    return;
  }
  const cite = target.closest<HTMLElement>("[data-cite]");
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
  $("answer").classList.add("hidden");
  $("preview").classList.remove("hidden");
  $("p-title").textContent = c.recordName ?? "Source";
  const link = /^https?:\/\//.test(c.webUrl ?? "") ? c.webUrl : answerLinks.get(c.number);
  $("p-open").classList.toggle("hidden", !link);
  $("p-open").onclick = () => link && app.openLink({ url: link });
  renderSide(sameRecord, c);
  await setDisplayMode("fullscreen");
  $("preview").classList.toggle("inline", displayMode !== "fullscreen");

  const pages = $("pages");
  pages.replaceChildren(el("div", "status", "Loading document…"));
  pageEls = [];
  const isPdf = c.mimeType === "application/pdf" || c.extension === "pdf";
  if (!c.recordId || !isPdf) {
    showText(c);
    return;
  }
  try {
    const { bytes } = await loadFile(c.recordId);
    if (token !== previewToken) return;
    await renderPdf(bytes.slice(), sameRecord, token);
    if (token === previewToken) focusCitation(c);
  } catch (err) {
    if (token !== previewToken) return;
    pages.replaceChildren(
      el("div", "status error", `Could not show the document: ${(err as Error).message}`),
    );
  }
}

/** A record pdf.js cannot show: its cited text, marked. */
function showText(c: Citation) {
  const doc = el("div", "text-doc");
  doc.append(el("mark", undefined, c.text));
  $("pages").replaceChildren(doc);
}

function closePreview() {
  previewToken++;
  $("preview").classList.add("hidden");
  $("answer").classList.remove("hidden");
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
    if (c.blockNum?.length) {
      tags.append(el("span", "tag", `Paragraph ${c.blockNum.join(", ")}`));
    }
    card.append(el("div", "label", `Citation ${c.number}`), quote, more, tags);
    card.onclick = () => {
      for (const x of document.querySelectorAll(".cite")) x.classList.toggle("active", x === card);
      focusCitation(c);
    };
    return card;
  }));
}

async function renderPdf(bytes: Uint8Array, list: Citation[], token: number) {
  const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  if (token !== previewToken) return;
  const pages = $("pages");
  const width = Math.min(pages.clientWidth - 32, 1000);
  pages.replaceChildren();

  // Placeholders sized from each page; canvases are drawn as they scroll in.
  const draw = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      draw.unobserve(entry.target);
      void drawPage(pdf, entry.target as HTMLElement);
    }
  }, { root: pages, rootMargin: "800px 0px" });

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    if (token !== previewToken) return;
    const vp = page.getViewport({ scale: 1 });
    const box = el("div", "page");
    box.dataset["page"] = String(n);
    box.style.width = `${width}px`;
    box.style.height = `${(width * vp.height) / vp.width}px`;
    for (const c of list) {
      if (c.pageNum?.[0] === n && c.boundingBox) box.append(highlight(c));
    }
    pages.append(box);
    pageEls.push(box);
    draw.observe(box);
  }
}

async function drawPage(pdf: pdfjs.PDFDocumentProxy, box: HTMLElement) {
  const page = await pdf.getPage(Number(box.dataset["page"]));
  const ratio = window.devicePixelRatio || 1;
  const vp = page.getViewport({ scale: (box.clientWidth * ratio) / page.getViewport({ scale: 1 }).width });
  const canvas = el("canvas");
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  box.prepend(canvas);
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
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

app.ontoolinput = ({ arguments: args }) => {
  const q = (args as any)?.query;
  if (typeof q === "string") $("question").textContent = `· ${q}`;
};

app.ontoolresult = (result) => {
  const text = (result.content?.find((c) => c.type === "text") as any)?.text;
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // An error result is plain text.
  }
  if (result.isError || typeof parsed?.answer !== "string") {
    $("status").textContent = text || "PipesHub returned no answer.";
    $("status").classList.add("error");
    return;
  }
  // `_meta` carries what the model does not need: bounding boxes, page and
  // block numbers. A host that drops it still gets the citations from the text.
  const fromMeta = (result._meta as any)?.["pipeshub/citations"]?.citations;
  citations = Array.isArray(fromMeta) ? fromMeta : (parsed.citations ?? []).map(
    (c: any): Citation => ({
      ...c,
      text: c.passage ?? "",
      pageNum: Array.isArray(c.pageNum) ? c.pageNum : undefined,
    }),
  );
  for (const [, n, url] of parsed.answer.matchAll(/\[(\d+)\]\(([^)\s]+)\)/g)) {
    if (/^https?:\/\//.test(url)) answerLinks.set(Number(n), url);
  }
  showAnswer(parsed.answer);
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
