// `pipeshub packs list|add|remove|embedding`: optional capability packs
// (web browser, document converter, local embedding models) over the packs API
// (`{origin}/api/v1/packs`). Progress is polled from GET /packs about once a second.

import { describeFetchFailure } from "../lib/fetch-failure.js";
import type { Ctx, Outcome } from "./commands.js";
import { CliError, EXIT, assertTransport } from "./config.js";

export interface Pack {
  id: string;
  name: string;
  kind: string;
  size: number;
  state: string;
  percent?: number;
  bytes?: number;
  error?: string | null;
  model?: string | null;
  active?: boolean;
  available?: boolean;
}
export interface EmbeddingSwitch {
  state: string;
  model?: string;
  fromModel?: string;
  percent?: number;
  done?: number;
  total?: number;
  error?: string | null;
}
interface Listing {
  platform?: string;
  packs: Pack[];
  embedding?: { default?: string; active?: string | null; switch?: EmbeddingSwitch | null };
}

export interface PacksOpts {
  /** Print a progress line. */
  say: (line: string) => void;
  /** Ask a yes/no question (remove). */
  confirm: (question: string) => Promise<boolean>;
  /** Wait for progress to finish (--wait, or the default on a terminal). */
  wait: boolean;
  /** Milliseconds between polls. */
  pollMs?: number;
}

const ACTIVE = new Set(["downloading", "verifying", "extracting"]);
const SWITCH_END = new Set(["done", "failed", "interrupted"]);

export function humanSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

/** The server's one-line message from `{error:{message}}`, `{detail}` (text or FastAPI's list) or `{message}`. */
function serverMessage(body: unknown): string | null {
  const b = body as { error?: { message?: unknown } | string; detail?: unknown; message?: unknown } | null;
  const detail = Array.isArray(b?.detail) ? (b.detail as { msg?: string }[]).map((d) => d.msg).filter(Boolean).join("; ") : b?.detail;
  const m = (typeof b?.error === "string" ? b.error : b?.error?.message) ?? detail ?? b?.message;
  return typeof m === "string" && m.trim() !== "" ? m.trim().split("\n")[0]! : null;
}

async function api<T>(ctx: Ctx, method: string, path: string, body?: unknown): Promise<T> {
  assertTransport(ctx.origin, ctx.insecureHttp);
  const res = await fetch(`${ctx.origin}/api/v1/packs${path}`, {
    method,
    headers: { authorization: `Bearer ${ctx.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(ctx.timeoutMs ?? 60_000),
  }).catch((e: unknown) => {
    throw new CliError(`PipesHub is not reachable at ${ctx.origin} (${describeFetchFailure(e)}). Is it running? 'pipeshub dev status' checks a local one.`);
  });
  const parsed = await res.json().catch(() => null);
  if (res.ok) return parsed as T;
  const msg = serverMessage(parsed);
  if (res.status === 401) throw new CliError(msg ?? "not signed in to this PipesHub. Run 'pipeshub login'.", EXIT.UNAUTHENTICATED);
  if (res.status === 403) throw new CliError(msg ?? "only an admin can change packs.", EXIT.FORBIDDEN);
  throw new CliError(msg ?? `HTTP ${res.status} ${res.statusText}`.trim());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const listing = (ctx: Ctx) => api<Listing>(ctx, "GET", "");

function find(l: Listing, id: string): Pack {
  const p = l.packs.find((x) => x.id === id);
  if (!p) throw new CliError(`unknown pack: ${id}. Packs: ${l.packs.map((x) => x.id).join(", ")}`, EXIT.USAGE);
  return p;
}

function stateText(p: Pack): string {
  return ACTIVE.has(p.state) ? `${p.state} ${p.percent ?? 0}%` : p.state;
}

function table(rows: string[][]): string {
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => r[i]!.length)));
  return rows.map((r) => r.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd()).join("\n");
}

export async function packsList(ctx: Ctx): Promise<Outcome> {
  const l = await listing(ctx);
  const rows = [["ID", "NAME", "SIZE", "STATE", "IN USE"], ...l.packs.map((p) => [
    p.id, p.name, humanSize(p.size), stateText(p), p.kind === "embedding" ? (p.active ? "yes" : "no") : "",
  ])];
  return { exit: EXIT.OK, payload: l as unknown as Record<string, unknown>, text: table(rows) };
}

/** Poll until the pack reaches a final state; throws with the server's error on failed/interrupted. */
async function waitForPack(ctx: Ctx, id: string, o: PacksOpts): Promise<Pack> {
  let last = "";
  for (;;) {
    const p = find(await listing(ctx), id);
    if (p.state === "installed") return p;
    if (p.state === "failed" || p.state === "interrupted" || p.state === "unavailable") {
      throw new CliError(`${p.name} ${p.state}: ${p.error ?? "no reason given"}${p.state === "interrupted" ? ` Run 'pipeshub packs add ${id}' again to continue.` : ""}`);
    }
    const line = `${p.name}: ${stateText(p)}${p.bytes ? ` (${(p.bytes / 1e6).toFixed(1)} MB of ${humanSize(p.size)})` : ""}`;
    if (line !== last) o.say(line);
    last = line;
    await sleep(o.pollMs ?? 1000);
  }
}

async function waitForSwitch(ctx: Ctx, o: PacksOpts): Promise<EmbeddingSwitch> {
  let last = "";
  for (;;) {
    const s = (await api<{ switch: EmbeddingSwitch | null }>(ctx, "GET", "/embedding/switch")).switch;
    if (s === null) throw new CliError("no embedding switch is running.");
    if (s.state === "done") return s;
    if (SWITCH_END.has(s.state)) throw new CliError(`switching to ${s.model ?? "the model"} ${s.state}: ${s.error ?? "no reason given"}`);
    const line = `Switching embedding model: ${s.state} ${s.percent ?? 0}%${s.total ? ` (${s.done ?? 0} of ${s.total})` : ""}. Search keeps using the previous model until it finishes.`;
    if (line !== last) o.say(line);
    last = line;
    await sleep(o.pollMs ?? 1000);
  }
}

async function startSwitch(ctx: Ctx, model: string | null, o: PacksOpts): Promise<Record<string, unknown>> {
  const started = await api<{ switch: EmbeddingSwitch }>(ctx, "POST", "/embedding/switch", { model });
  const sw = o.wait ? await waitForSwitch(ctx, o) : started.switch;
  return { switch: sw, message: o.wait ? `Search now uses ${sw.model ?? "the built-in model"}.` : "Switch started. Check it with: pipeshub packs embedding" };
}

export async function packsAdd(ctx: Ctx, id: string, file: string | null, use: boolean, o: PacksOpts): Promise<Outcome> {
  const before = find(await listing(ctx), id);
  if (use && before.kind !== "embedding") throw new CliError(`--use applies to embedding packs only; ${id} is a ${before.kind} pack.`, EXIT.USAGE);
  if (use && !o.wait) throw new CliError("--use needs --wait: the model can only be switched to once it is installed.", EXIT.USAGE);
  let pack = before;
  if (before.state === "installed" && file === null) {
    o.say(`${before.name} is already installed.`);
  } else {
    await api(ctx, "POST", `/${encodeURIComponent(id)}/install`, file === null ? {} : { file });
    if (o.wait) pack = await waitForPack(ctx, id, o);
  }
  const out: Record<string, unknown> = { requestId: ctx.requestId, pack };
  let text = o.wait ? `${pack.name} is installed.` : `Installing ${pack.name}. Check progress with: pipeshub packs list`;
  if (use) {
    Object.assign(out, await startSwitch(ctx, pack.model ?? null, o));
    text += ` ${out["message"] as string}`;
  }
  return { exit: EXIT.OK, payload: out, text };
}

export async function packsRemove(ctx: Ctx, id: string, yes: boolean, o: PacksOpts): Promise<Outcome> {
  const p = find(await listing(ctx), id);
  if (!yes && !(await o.confirm(`Remove ${p.name} (${humanSize(p.size)})? [y/N] `))) {
    throw new CliError("not removed.");
  }
  const r = await api<{ pack: Pack }>(ctx, "DELETE", `/${encodeURIComponent(id)}`);
  return { exit: EXIT.OK, payload: { requestId: ctx.requestId, ...r }, text: `${p.name} is removed.` };
}

export async function packsEmbedding(ctx: Ctx, target: string | null, builtin: boolean, o: PacksOpts): Promise<Outcome> {
  if (target !== null && builtin) throw new CliError("give a model or --builtin, not both.", EXIT.USAGE);
  const l = await listing(ctx);
  if (target === null && !builtin) {
    const e = l.embedding ?? {};
    const s = e.switch;
    const text = `Search uses ${e.active ?? e.default ?? "the built-in model"} (built-in: ${e.default ?? "unknown"}).`
      + (s ? ` Switch to ${s.model ?? "?"}: ${s.state} ${s.percent ?? 0}%${s.error ? `, ${s.error}` : ""}.` : "");
    return { exit: EXIT.OK, payload: { requestId: ctx.requestId, embedding: e }, text };
  }
  // A pack id or a model name both work.
  const model = builtin ? null : (l.packs.find((p) => p.id === target)?.model ?? target);
  const out = await startSwitch(ctx, model, o);
  return { exit: EXIT.OK, payload: { requestId: ctx.requestId, ...out }, text: out["message"] as string };
}
