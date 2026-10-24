/*
 * Hand-written: the knowledge-base calls the write tools need. Speakeasy no
 * longer generates this package, so these share one request path instead of
 * copying a generated func per endpoint.
 */

import { PipeshubCore } from "../core.js";
import { encodeFormQuery } from "../lib/encodings.js";
import { RequestOptions } from "../lib/sdks.js";
import { extractSecurity, resolveGlobalSecurity } from "../lib/security.js";
import { pathToFunc } from "../lib/url.js";
import { APIError } from "../models/errors/apierror.js";
import {
  ConnectionError,
  InvalidRequestError,
  RequestAbortedError,
  RequestTimeoutError,
  UnexpectedClientError,
} from "../models/errors/httpclienterrors.js";
import { Result } from "../types/fp.js";

type SendResult = Result<
  Response,
  | APIError
  | UnexpectedClientError
  | InvalidRequestError
  | RequestAbortedError
  | RequestTimeoutError
  | ConnectionError
>;

async function send(
  client$: PipeshubCore,
  req: {
    operationID: string;
    oAuth2Scopes: string[];
    method: "GET" | "POST";
    path: string;
    query?: string;
    body?: BodyInit | null;
    json?: boolean;
    accept?: string;
  },
  options?: RequestOptions,
): Promise<SendResult> {
  const headers$ = new Headers({ Accept: req.accept ?? "application/json" });
  // A FormData body must not get a Content-Type here: fetch adds the boundary.
  if (req.json) headers$.set("Content-Type", "application/json");
  const requestSecurity = resolveGlobalSecurity(
    await extractSecurity(client$._options.security),
  );
  const context = {
    options: client$._options,
    baseURL: options?.serverURL ?? client$._baseURL ?? "",
    operationID: req.operationID,
    oAuth2Scopes: req.oAuth2Scopes,
    resolvedSecurity: requestSecurity,
    securitySource: client$._options.security,
    // Writes are not retried: a retried upload would store the files twice.
    retryConfig: options?.retries
      || (req.method === "GET" ? client$._options.retryConfig : undefined)
      || { strategy: "none" as const },
    retryCodes: options?.retryCodes || ["429", "500", "502", "503", "504"],
  };
  const requestRes = client$._createRequest(context, {
    security: requestSecurity,
    method: req.method,
    baseURL: options?.serverURL,
    path: req.path,
    headers: headers$,
    query: req.query ?? "",
    body: req.body ?? null,
    userAgent: client$._options.userAgent,
    timeoutMs: options?.timeoutMs || client$._options.timeoutMs || -1,
  }, options);
  if (!requestRes.ok) return requestRes;
  return client$._do(requestRes.value, {
    context,
    errorCodes: [],
    retryConfig: context.retryConfig,
    retryCodes: context.retryCodes,
  });
}

/** `POST /knowledgeBase` → `{ id, name, … }`. */
export function knowledgeBaseCreate(
  client$: PipeshubCore,
  kbName: string,
  options?: RequestOptions,
): Promise<SendResult> {
  return send(client$, {
    operationID: "createKnowledgeBase",
    oAuth2Scopes: ["kb:write"],
    method: "POST",
    path: pathToFunc("/knowledgeBase")(),
    body: JSON.stringify({ kbName }),
    json: true,
  }, options);
}

export type UploadFile = { name: string; bytes: Uint8Array; type: string };

/**
 * `POST /knowledgeBase/{kbId}/upload` (multipart `files`). The answer is an
 * SSE stream of `file:succeeded` / `file:failed` frames, then `done`.
 */
export function knowledgeBaseUpload(
  client$: PipeshubCore,
  kbId: string,
  files: UploadFile[],
  options?: RequestOptions,
): Promise<SendResult> {
  const form = new FormData();
  const now = Date.now();
  for (const f of files) {
    form.append("files", new Blob([f.bytes], { type: f.type }), f.name);
  }
  form.append(
    "files_metadata",
    JSON.stringify(files.map((f) => ({ file_path: f.name, last_modified: now }))),
  );
  return send(client$, {
    operationID: "uploadRecords",
    oAuth2Scopes: ["kb:upload"],
    method: "POST",
    path: pathToFunc("/knowledgeBase/{kbId}/upload")({ kbId }),
    body: form,
    accept: "text/event-stream",
  }, options);
}

/**
 * `GET /knowledgeBase/knowledge-hub/nodes/app/{kbId}?flattened=true` — one page
 * of a collection's records, optionally only those in `indexingStatus`. The
 * response's `pagination.totalItems` counts every match, not just the page.
 */
export function knowledgeHubCollectionRecords(
  client$: PipeshubCore,
  kbId: string,
  query: { limit: number; indexingStatus?: readonly string[] },
  options?: RequestOptions,
): Promise<SendResult> {
  return send(client$, {
    operationID: "getKnowledgeHubChildNodes",
    oAuth2Scopes: ["kb:read"],
    method: "GET",
    path: pathToFunc("/knowledgeBase/knowledge-hub/nodes/app/{kbId}")({ kbId }),
    query: encodeFormQuery({
      flattened: true,
      nodeTypes: "record",
      page: 1,
      limit: query.limit,
      indexingStatus: query.indexingStatus?.join(","),
    }),
  }, options);
}
