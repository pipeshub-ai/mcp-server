import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolDefinition } from "../tools.js";

/**
 * `pipeshub_search` results as plain text for the agent, instead of JSON.
 *
 * A model pays for search results by the token, and JSON is dear: every
 * passage's line breaks and quotes are escaped, and every record repeats the
 * same dozen field names. On 40 real search results from an Apache eval
 * (pipeshub-ai/mcp-server#140's lean results, as Claude counts them) the same
 * content set as text took 35% fewer tokens, about 3,400 fewer per answer, and
 * each of those tokens is paid again on every later step of the agent's turn.
 *
 * Nothing is left out: every field the JSON carries is a line here, under the
 * same name where the agent is told to use it (`recordId`, `webUrl`,
 * `passagesFound`, `nextOffset`). Programs still get JSON: the `pipeshub` CLI
 * sends `x-pipeshub-request-id` with every call and parses the result, so any
 * request carrying it, or `x-pipeshub-result-format: json`, gets the result
 * as the tool built it.
 */

/** Header a program sends to get JSON results. */
export const RESULT_FORMAT_HEADER = "x-pipeshub-result-format";
/** Sent by every `pipeshub` CLI release (src/cli/client.ts), which parses JSON. */
const CLI_REQUEST_ID_HEADER = "x-pipeshub-request-id";

type Headers = Record<string, string | string[] | undefined>;

/** Whether the caller is a program that reads the result as JSON. */
export function wantsJson(extra: unknown): boolean {
  const headers = (extra as { requestInfo?: { headers?: Headers } } | undefined)
    ?.requestInfo?.headers;
  if (!headers) return false;
  const get = (name: string) => {
    const v = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const format = get(RESULT_FORMAT_HEADER);
  if (typeof format === "string" && format.trim() !== "") {
    return format.trim().toLowerCase() === "json";
  }
  return typeof get(CLI_REQUEST_ID_HEADER) === "string";
}

const INDENT = "   ";
const PASSAGE_INDENT = "     ";

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** One record: a numbered name line, its fields, its links and passages. */
function recordLines(r: any, n: number): string[] {
  const out: string[] = [`${n}. ${str(r?.recordName) ?? "(no name)"}`];
  const kind = [str(r?.connector), str(r?.recordType)].filter(Boolean).join(" ");
  const facts = [
    `recordId: ${r?.recordId}`,
    kind || undefined,
    str(r?.createdAt) && `created ${r.createdAt}`,
    str(r?.updatedAt) && `updated ${r.updatedAt}`,
    str(r?.period) && `period ${r.period}`,
    num(r?.score) !== undefined ? `score ${r.score}` : undefined,
  ].filter(Boolean);
  out.push(INDENT + facts.join(" · "));
  if (str(r?.parent)) out.push(`${INDENT}parent: ${r.parent}`);
  if (str(r?.webUrl)) out.push(`${INDENT}webUrl: ${r.webUrl}`);
  if (str(r?.status)) out.push(`${INDENT}status: ${r.status}`);
  const links = Array.isArray(r?.links) ? r.links.filter((l: unknown) => typeof l === "string") : [];
  if (links.length > 0) {
    const found = num(r?.linksFound);
    out.push(`${INDENT}links${found !== undefined ? ` (${links.length} of ${found})` : ""}:`);
    for (const l of links) out.push(`${INDENT}- ${l}`);
  }
  const passages = Array.isArray(r?.passages) ? r.passages : [];
  const found = num(r?.passagesFound);
  if (found !== undefined || passages.length > 0) {
    out.push(`${INDENT}passages: ${passages.length} shown${found !== undefined ? ` of passagesFound ${found}` : ""}`);
  }
  for (const p of passages) {
    const text = typeof p === "string" ? p : str(p?.text) ?? "";
    const lines = text.split("\n");
    out.push(`${INDENT}> ${lines[0] ?? ""}`);
    for (const line of lines.slice(1)) out.push(line === "" ? "" : PASSAGE_INDENT + line);
    const where = [
      num(p?.pageNum) !== undefined ? `page ${p.pageNum}` : undefined,
      str(p?.cite) && `cite: ${p.cite}`,
    ].filter(Boolean);
    if (where.length > 0) out.push(PASSAGE_INDENT + where.join(" · "));
  }
  return out;
}

/** The search result object `pipeshub_search` builds, as text. */
export function searchResultText(result: any): string {
  const out: string[] = [];
  const records = Array.isArray(result?.records) ? result.records : [];
  const total = num(result?.totalRecords) ?? records.length;
  out.push(`totalRecords: ${total}${records.length > 0 ? ", best first" : ""}`);
  if (str(result?.searchId)) out.push(`searchId: ${result.searchId}`);
  const t = result?.timeline;
  if (t && typeof t === "object") {
    const span = [str(t.start), str(t.end)].filter(Boolean).join(" to ");
    const periods = Array.isArray(t.periods)
      ? t.periods.map((p: any) => `${p?.label}: ${p?.records ?? 0}`).join(" · ")
      : "";
    out.push(`timeline by ${str(t.dateField) ?? "created"}${span ? `, ${span}` : ""}; records per period: ${periods}`);
  }
  records.forEach((r: any, i: number) => {
    out.push("");
    out.push(...recordLines(r, i + 1));
  });
  const outside = result?.outsideDates;
  if (outside && typeof outside === "object" && Array.isArray(outside.records)) {
    out.push("");
    const found = num(outside.recordsFound);
    out.push(`outsideDates${found !== undefined ? ` (${outside.records.length} of ${found})` : ""}: ${str(outside.note) ?? ""}`);
    outside.records.forEach((r: any, i: number) => {
      out.push(...recordLines(r, i + 1).map((l) => (l === "" ? l : INDENT + l)));
    });
  }
  if (num(result?.nextOffset) !== undefined) {
    out.push("");
    out.push(`nextOffset: ${result.nextOffset}`);
  }
  const notes = Array.isArray(result?.notes) ? result.notes.filter((n: unknown) => typeof n === "string") : [];
  if (notes.length > 0) {
    out.push("");
    out.push("notes:");
    for (const n of notes) out.push(`- ${n}`);
  }
  if (str(result?.next)) {
    out.push("");
    out.push(result.next);
  }
  return out.join("\n");
}

/** The JSON text a tool returned, as the search text; anything else as it was. */
function resultAsText(result: CallToolResult): CallToolResult {
  if (result.isError) return result;
  return {
    ...result,
    content: result.content.map((c) => {
      if (c.type !== "text" || !c.text.startsWith("{")) return c;
      try {
        return { ...c, text: searchResultText(JSON.parse(c.text)) };
      } catch {
        return c;
      }
    }),
  };
}

/**
 * `pipeshub_search` with its result set as text for agents. Applied outside
 * `cited`, so a client that shows no citation card has its `cite` codes
 * removed from the JSON before it is set as text.
 */
export function searchAsText<T extends ToolDefinition<any>>(def: T): T {
  const run = def.tool as (...a: unknown[]) => Promise<CallToolResult>;
  return {
    ...def,
    tool: async (...a: unknown[]) => {
      const result = await run(...a);
      return wantsJson(a[a.length - 1]) ? result : resultAsText(result);
    },
  };
}
