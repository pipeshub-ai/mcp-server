/*
 * Ambient per-tool-call request-id context (AsyncLocalStorage). Mirrors the
 * pipeshub-ai backend's own request-context pattern (same header name,
 * `x-request-id`) so a single id traces one MCP tool/resource/prompt
 * invocation across every backend HTTP call it makes.
 *
 * `tools.ts` / `resources.ts` / `prompts.ts` are Speakeasy-generated and
 * regenerated on every build, so there is no `next()`-style wrapper point to
 * bind context around a call. Instead `bindNewRequestId` is called from the
 * hand-written `getClient` closure in `server.ts`, which every generated
 * dispatch site calls synchronously as the first thing before invoking a
 * tool/resource/prompt handler — `enterWith` binds the store for the rest of
 * that handler's execution (sync remainder + everything it awaits).
 *
 * The final id (`mcp-<userId>-<random>` or `mcp-<random>`) can't be composed
 * at bind time — `getClient` only has a `PipeshubCore`, not yet a resolved
 * `Authorization` header, and resolving security may be async (OAuth2)
 * while `getClient` must stay sync (generated call sites pass its return
 * value straight into a handler, never await it). So only the random suffix
 * is fixed here; `requestid.ts`'s hook fills in `finalId` off the first
 * outbound request's `Authorization` header and every later call in the
 * same tool invocation reuses that cached value.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { nanoid } from "nanoid";

export interface RequestContextStore {
  random: string;
  finalId?: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/** Bind a fresh request-id context for the remainder of the current async chain. */
export function bindNewRequestId(): void {
  storage.enterWith({ random: nanoid() });
}

export function getRequestContextStore(): RequestContextStore | undefined {
  return storage.getStore();
}

/** One-off id for the rare case a backend call happens with no bound tool-call context. */
export function newRequestId(): string {
  return `mcp-${nanoid()}`;
}
