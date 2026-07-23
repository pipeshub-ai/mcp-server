/*
 * Adapted from Speakeasy-generated connectorGetRecordContent.
 */

import { PipeshubCore } from "../core.js";
import { encodeSimple } from "../lib/encodings.js";
import { compactMap } from "../lib/primitives.js";
import { safeParse } from "../lib/schemas.js";
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
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import {
  GetRecordContentRequest,
  GetRecordContentRequest$zodSchema,
} from "../models/getrecordcontentop.js";
import { APICall, APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";

/**
 * Get a record's full parsed content and metadata
 *
 * @remarks
 * Retrieve the full parsed content and metadata of a single record —
 * the same content PipesHub's own RAG/chat pipeline uses to answer
 * questions, returned directly instead of via chat.
 *
 * **When to use this vs. the other record endpoints:**
 * - `GET /knowledgeBase/record/{recordId}` returns metadata only
 *   (name, type, indexing status, size) — no content.
 * - `GET /knowledgeBase/stream/record/{recordId}` returns the original,
 *   unparsed file bytes — use it to download/open the source file.
 * - **This endpoint** returns the record's full parsed content as a
 *   single plain-text `content` string (a metadata header, then the
 *   block/table text in reading order) — use it when you need the
 *   record's actual textual/tabular content without downloading and
 *   re-parsing the original file yourself.
 *
 * **Typical flow:** obtain a `recordId` from a `pipeshub_search` hit or
 * a chat citation's `recordId`, then call this endpoint to read the
 * full content when the search snippet or citation excerpt isn't
 * enough to answer the question.
 *
 * **Permission scoping:**
 *
 * The requesting user/token must have access to the record; access is
 * verified via the knowledge graph before content is returned — a
 * caller with a valid scope but no access to this specific record gets
 * a `403`.
 *
 * If set, this operation will use either {@link Security.bearerAuth} or {@link Security.oauth2} from the global security.
 */
export function connectorGetRecordContent(
  client$: PipeshubCore,
  request: GetRecordContentRequest,
  options?: RequestOptions,
): APIPromise<
  Result<
    Response,
    | APIError
    | SDKValidationError
    | UnexpectedClientError
    | InvalidRequestError
    | RequestAbortedError
    | RequestTimeoutError
    | ConnectionError
  >
> {
  return new APIPromise($do(
    client$,
    request,
    options,
  ));
}

async function $do(
  client$: PipeshubCore,
  request: GetRecordContentRequest,
  options?: RequestOptions,
): Promise<
  [
    Result<
      Response,
      | APIError
      | SDKValidationError
      | UnexpectedClientError
      | InvalidRequestError
      | RequestAbortedError
      | RequestTimeoutError
      | ConnectionError
    >,
    APICall,
  ]
> {
  const parsed$ = safeParse(
    request,
    (value$) => GetRecordContentRequest$zodSchema.parse(value$),
    "Input validation failed",
  );
  if (!parsed$.ok) {
    return [parsed$, { status: "invalid" }];
  }
  const payload$ = parsed$.value;
  const body$ = null;

  const pathParams$ = {
    recordId: encodeSimple("recordId", payload$.recordId, {
      explode: false,
      charEncoding: "percent",
    }),
  };
  const path$ = pathToFunc("/connectors/record/{recordId}/content")(
    pathParams$,
  );

  const headers$ = new Headers(compactMap({
    Accept: "application/json",
  }));
  const securityInput = await extractSecurity(client$._options.security);
  const requestSecurity = resolveGlobalSecurity(securityInput);

  const context = {
    options: client$._options,
    baseURL: options?.serverURL ?? client$._baseURL ?? "",
    operationID: "getRecordContent",
    oAuth2Scopes: ["connector:read"],
    resolvedSecurity: requestSecurity,
    securitySource: client$._options.security,
    retryConfig: options?.retries
      || client$._options.retryConfig
      || { strategy: "none" },
    retryCodes: options?.retryCodes || [
      "429",
      "500",
      "502",
      "503",
      "504",
    ],
  };

  const requestRes = client$._createRequest(context, {
    security: requestSecurity,
    method: "GET",
    baseURL: options?.serverURL,
    path: path$,
    headers: headers$,
    body: body$,
    userAgent: client$._options.userAgent,
    timeoutMs: options?.timeoutMs || client$._options.timeoutMs
      || -1,
  }, options);
  if (!requestRes.ok) {
    return [requestRes, { status: "invalid" }];
  }
  const req$ = requestRes.value;

  const doResult = await client$._do(req$, {
    context,
    errorCodes: [],
    retryConfig: context.retryConfig,
    retryCodes: context.retryCodes,
  });
  if (!doResult.ok) {
    return [doResult, { status: "request-error", request: req$ }];
  }
  return [doResult, {
    status: "complete",
    "request": req$,
    response: doResult.value,
  }];
}
