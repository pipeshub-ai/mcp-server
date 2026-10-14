// Evidence a caller can check a `pipeshub_chat` answer against.
//
// The persisted answer marks each cited sentence with `[N](url)`, where N is
// the citation's `chunkIndex`, and each citation carries the whole text the
// assistant cited. From those two alone this module pairs every cited
// sentence with its citation numbers and the lines of the cited text that
// best support it, copied verbatim, and lists the sentences that cite
// nothing. It is a pure function of the answer and its citations: no model
// call, so a quote can never be invented.

/** What a citation's text is, from the backend's `blockType` / `citationType`. */
export type CitationTextKind =
  /** A block of the record, in its own words. */
  | "passage"
  /** The text the keyword search matched in the record, in its own words. */
  | "matchedText"
  /** A summary PipesHub wrote when it indexed the record: not its own words. */
  | "summary"
  /** Only the record's name: the assistant cited the record as a whole. */
  | "recordName"
  /** A web page the assistant found with web search, not an org record. */
  | "web";

export interface EvidenceCitation {
  number: number;
  kind: CitationTextKind;
  /** The full cited text, before any cut for size. */
  text: string;
  /** Searched alongside `text` for the specifics a claim names. */
  recordName?: string | undefined;
  webUrl?: string | undefined;
}

export interface ClaimQuote {
  citation: number;
  text: string;
}

export interface Claim {
  text: string;
  citations: number[];
  quotes: ClaimQuote[];
  notInCitedText?: string[];
}

export interface AnswerEvidence {
  claims: Claim[];
  uncitedSentences: string[];
}

/** Longest quote kept for one claim from one citation. */
export const QUOTE_MAX_CHARS = 300;

const MARKER = /\[(\d+)\]\([^)\s]*\)/g;
const LEADING_MARKERS = /^(?:\s*\[\d+\]\([^)\s]*\))+/;

/** Kinds whose text is the source's own words, so a line of it is a quote. */
const VERBATIM: ReadonlySet<CitationTextKind> = new Set([
  "passage",
  "matchedText",
  "web",
]);

const STOP_WORDS = new Set(
  (
    "a an the is are was were be been being have has had do does did will would "
    + "could should may might can shall must i me my we us our you your he she it "
    + "its they them their this that these those what which who whom where when why "
    + "how and or but not no nor for to of in on at by with from about into through "
    + "if then so as than also just any all some each every very much more most "
    + "there here per via up out over under after before while"
  ).split(" "),
);

/**
 * Identifiers and numbers a claim states: ticket keys (`PA-1212`), `#3758`,
 * versions, dates, times and amounts. These are what a wrong-but-related
 * source gets wrong, so they weigh most when choosing a quote, and the ones
 * no cited text contains are reported.
 */
const SPECIFIC =
  /\b[A-Z][A-Z0-9]{1,9}-\d+\b|#\d+\b|(?<![\p{L}\p{N}.])[vV]?\d+(?:\.\d+)+(?:[A-Za-z][A-Za-z0-9]*)?(?:[-+][0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)*(?![\p{L}\p{N}]|[.+-][\p{L}\p{N}])|(?<![\p{L}\p{N}.])\d[\d,.:/-]*\d(?![\p{L}\p{N}]|\.[\p{L}\p{N}])/gu;

/**
 * A time of day is not reported missing: the assistant writes times in the
 * reader's zone ("3:45 PM PDT") while records hold UTC, so a correct time
 * rarely appears as written.
 */
const TIME_OF_DAY = /^\d{1,2}:\d{2}(:\d{2})?$/;

function normalise(text: string): string {
  return text.toLowerCase().replace(/(?<=\d),(?=\d)/g, "");
}

function specificsOf(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(SPECIFIC)) seen.add(m[0]);
  return [...seen];
}

/** `#3758` matches `3758` and `/pull/3758`; `1,250,000` matches `1250000`. */
function specificKey(specific: string): string {
  return normalise(specific.replace(/^#/, ""));
}

function contains(haystack: string, specific: string): boolean {
  let key = specificKey(specific);
  // A dotted version must match whole, suffix included: v1.2 is not inside
  // v1.2.3, v2.3 is not inside v2.2.3, and v1.2.3 is not v1.2.3-rc.1. It may be written with or without its "v", on
  // either side: v1.2.3 matches "Release 1.2.3", and 1.2.3 matches "v1.2.3".
  const version = /^v?\d+(\.\d+)+/.test(key);
  if (version) key = key.replace(/^v/, "");
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = version
    ? `(?<![\\p{L}\\p{N}.])v?${escaped}(?![\\p{L}\\p{N}]|[.+-][\\p{L}\\p{N}])`
    : `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
  return new RegExp(pattern, "u").test(haystack);
}

/**
 * The parts of a citation link that can name what a claim states. A preview
 * link's `blockIndex` is the block's position in the record, not an ID.
 */
function linkIds(webUrl: string | undefined): string {
  return (webUrl ?? "").replace(/[#?&]blockIndex=\d+/g, "");
}

function words(text: string): string[] {
  return (normalise(text).match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (w) => w.length > 1 && !STOP_WORDS.has(w),
  );
}

/** Sentences of one line of prose; a marker after a full stop stays with it. */
function splitSentences(line: string): string[] {
  const parts = line.split(/(?<=[.!?])\s+(?=\S)/);
  const out: string[] = [];
  for (const part of parts) {
    const lead = part.match(LEADING_MARKERS);
    if (lead && out.length > 0) {
      out[out.length - 1] += lead[0];
      const rest = part.slice(lead[0].length).trim();
      if (rest) out.push(rest);
    } else {
      out.push(part);
    }
  }
  return out;
}

/** The prose units of a markdown answer: sentences, list items, table rows. */
function answerUnits(answer: string): string[] {
  const units: string[] = [];
  let inFence = false;
  let headerAt = -1;
  // Only a table's first separator follows its header row.
  let separatorSeen = false;
  for (const raw of answer.split("\n")) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line || /^#{1,6}\s/.test(line)) {
      // A blank line or a heading ends any table above it.
      headerAt = -1;
      separatorSeen = false;
      continue;
    }
    // A table's separator row has a pipe; a line of dashes alone is a break.
    if (line.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line)) {
      // The row above a separator is the table's header, not a statement.
      if (!separatorSeen && headerAt === units.length - 1) units.pop();
      separatorSeen = true;
      headerAt = -1;
      continue;
    }
    if (!line.startsWith("|")) {
      headerAt = -1;
      separatorSeen = false;
    }
    if (line.startsWith("|")) {
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      units.push(cells.filter(Boolean).join(" | "));
      headerAt = units.length - 1;
      continue;
    }
    const body = line.replace(/^(?:[-*+]|\d+[.)]|>)\s+/, "");
    const sentences = splitSentences(body);
    // A line that opens with markers belongs to the sentence before it.
    const first = sentences[0];
    const lead = first?.match(LEADING_MARKERS);
    if (first && lead && units.length > 0) {
      units[units.length - 1] += lead[0];
      const rest = first.slice(lead[0].length).trim();
      if (rest) sentences[0] = rest;
      else sentences.shift();
    }
    units.push(...sentences);
  }
  return units;
}

/** A claim's text for a reader: `[N](url)` becomes `[N]`, emphasis goes. */
function readable(unit: string): string {
  return unit
    .replace(MARKER, "[$1]")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "If you want, I can…": the assistant offering more, not stating a fact. */
const OFFER = /^(if you (want|like)|let me know|would you like|i can also)\b/i;

function isProse(unit: string): boolean {
  const text = readable(unit);
  if (text.endsWith(":") || OFFER.test(text)) return false;
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 4;
}

/** Candidate quotes: the lines and sentences of a cited text. */
function segments(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    for (const s of line.split(/(?<=[.!?])\s+(?=\S)/)) {
      const t = s.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function clip(segment: string, specifics: string[]): string {
  if (segment.length <= QUOTE_MAX_CHARS) return segment;
  // Keep the window around the first specific the claim names, if any.
  const lower = normalise(segment);
  let at = 0;
  for (const s of specifics) {
    const i = lower.indexOf(specificKey(s));
    if (i >= 0) {
      at = i;
      break;
    }
  }
  const start = Math.max(0, Math.min(at - 100, segment.length - QUOTE_MAX_CHARS));
  const end = start + QUOTE_MAX_CHARS;
  return (start > 0 ? "…" : "") + segment.slice(start, end).trim()
    + (end < segment.length ? "…" : "");
}

/**
 * The lines of `text` that best support `claim`: the best-scoring one, plus
 * a second when it holds a specific the first lacks. A specific the claim
 * names weighs three times an ordinary word. Nothing is returned when no line
 * shares more than one ordinary word with the claim.
 */
export function quotesFor(claim: string, text: string): string[] {
  const specifics = specificsOf(claim);
  const claimWords = new Set(words(claim));
  const scored = segments(text).map((segment) => {
    const lower = normalise(segment);
    const held = specifics.filter((s) => contains(lower, s));
    const shared = new Set(words(segment).filter((w) => claimWords.has(w)));
    return { segment, held, score: 3 * held.length + shared.size };
  });
  // A line holding a specific the claim names qualifies with one more shared
  // word; otherwise it must share a quarter of the claim's words, and two at
  // least, so a line sharing one common word is never offered as a quote.
  const enough = Math.max(2, Math.ceil(claimWords.size / 4));
  const ranked = scored
    .filter((s) => (s.held.length > 0 ? s.score >= 4 : s.score >= enough))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return [];
  const picked = [best];
  const second = ranked.find(
    (s) => s !== best && s.held.some((h) => !best.held.includes(h)),
  );
  if (second) picked.push(second);
  return picked.map((p) => clip(p.segment, specifics));
}

/**
 * Pair each cited sentence of `answer` with its citations and quotes, and
 * list the sentences that cite nothing.
 *
 * Quotes come only from text in the source's own words (`VERBATIM`): a quote
 * from a summary would look like evidence without being any. `notInCitedText`
 * lists the IDs and numbers a claim states that none of its cited texts, nor
 * their record names or links, contain.
 */
export function answerEvidence(
  answer: string,
  citations: EvidenceCitation[],
): AnswerEvidence {
  const byNumber = new Map(citations.map((c) => [c.number, c]));
  const claims: Claim[] = [];
  const uncitedSentences: string[] = [];

  for (const unit of answerUnits(answer)) {
    const numbers = [
      ...new Set([...unit.matchAll(MARKER)].map((m) => Number(m[1]))),
    ];
    if (numbers.length === 0) {
      if (isProse(unit)) uncitedSentences.push(readable(unit));
      continue;
    }
    const text = readable(unit);
    const claimText = text.replace(/\[\d+\]/g, " ");
    const quotes: ClaimQuote[] = [];
    const haystacks: string[] = [];
    for (const n of numbers) {
      const cited = byNumber.get(n);
      if (!cited) continue;
      haystacks.push(
        normalise([cited.text, cited.recordName ?? "", linkIds(cited.webUrl)].join("\n")),
      );
      if (!VERBATIM.has(cited.kind)) continue;
      for (const q of quotesFor(claimText, cited.text)) {
        quotes.push({ citation: n, text: q });
      }
    }
    const missing = haystacks.length === 0
      ? []
      : specificsOf(claimText).filter(
        (s) => !TIME_OF_DAY.test(s) && !haystacks.some((h) => contains(h, s)),
      );
    claims.push({
      text,
      citations: numbers,
      quotes,
      ...(missing.length > 0 ? { notInCitedText: missing } : {}),
    });
  }
  return { claims, uncitedSentences };
}
