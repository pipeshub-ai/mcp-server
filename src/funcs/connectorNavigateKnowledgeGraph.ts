/*
 * Adapted from Speakeasy-generated connectorNavigateKnowledgeGraph.
 */

import { PipeshubCore } from "../core.js";
import { encodeFormQuery } from "../lib/encodings.js";
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
  NavigateKnowledgeGraphRequest,
  NavigateKnowledgeGraphRequest$zodSchema,
} from "../models/navigateknowledgegraphop.js";
import { APICall, APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";

/**
 * Browse the knowledge graph from a node
 *
 * @remarks
 * Open a node in the knowledge graph and see what is inside it — a file
 * explorer across every connected source.
 *
 * Call it with no `nodeId` for a flat listing of every record group and
 * record the caller can reach, newest first. This is a starting point to
 * pick a node from, not a roster of connected apps — app nodes are never
 * returned in a listing, though an app's `id` is accepted as a `nodeId`
 * and lists that app's record groups. Pass a node's `id` to descend:
 * record groups contain records and folders, and a record contains its
 * own children — comments, attachments, sub-tasks — plus a `related`
 * section of cross-referenced records, such as the Confluence page linked
 * from a Jira ticket. `nodeId` is tolerant: a URL or an issue key such as
 * `PA-1787` is resolved to its record before navigating, so a link can be
 * pasted straight in without a separate lookup call.
 *
 * The response carries a rendered `text` view — breadcrumbs, the current
 * node, the children listing, `Related:`, and a closing `Next:` line
 * naming a follow-up call. The structured fields carry the same
 * information for programmatic use.
 *
 * **When to use this vs. the other record endpoints:**
 * - **This endpoint** is for structural exploration — "what is in this
 *   project", "what is attached to this ticket", "what else links to this
 *   page". It returns names, types and IDs; it never returns document
 *   text.
 * - `GET /connectors/record/{recordId}/content` returns one record's
 *   actual parsed text. Use it once navigation has identified the record
 *   you want to read.
 * - `GET /connectors/record/lookup` is the way in when you hold a URL or
 *   an issue key rather than a position in the tree.
 *
 * **Typical flow:** call with no `nodeId` to see what is reachable → pass
 * a record group's `id` to list its records → take a row whose
 * `is_record` is true and call
 * `GET /connectors/record/{recordId}/content` to read it.
 *
 * **Paging and depth:** results are paginated; `pagination.has_next`
 * tells you whether to request the next `page`. `depth` above 1 returns
 * all descendants down to that level as one flat list, each row carrying
 * its own `level`, instead of only direct children.
 *
 * **Scope:** everything the caller can read, across both connectors and
 * Knowledge Base collections. No connector-level filter is applied — the
 * listing is bounded by per-node permissions alone.
 *
 * **Permission scoping:**
 *
 * `rows` and `related` carry only nodes the caller can see, and the
 * opened node itself is access-checked before any of its details are
 * returned. A node that does not exist and a node the caller cannot
 * access are deliberately indistinguishable — both return an empty view
 * rather than an error.
 *
 * `breadcrumbs` is the exception: the ancestor trail is resolved by id
 * alone, without a permission check. For a record shared directly with
 * the caller, it can therefore name ancestors the caller cannot open.
 * Treat breadcrumb entries as labels, not as nodes guaranteed to be
 * navigable.
 *
 * If set, this operation will use either {@link Security.bearerAuth} or {@link Security.oauth2} from the global security.
 */
export function connectorNavigateKnowledgeGraph(
  client$: PipeshubCore,
  request?: NavigateKnowledgeGraphRequest | undefined,
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
  request?: NavigateKnowledgeGraphRequest | undefined,
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
    (value$) =>
      NavigateKnowledgeGraphRequest$zodSchema.optional().parse(value$),
    "Input validation failed",
  );
  if (!parsed$.ok) {
    return [parsed$, { status: "invalid" }];
  }
  const payload$ = parsed$.value;
  const body$ = null;
  const path$ = pathToFunc("/connectors/navigate")();
  const query$ = encodeFormQuery({
    "createdAfter": payload$?.createdAfter,
    "createdBefore": payload$?.createdBefore,
    "depth": payload$?.depth,
    "limit": payload$?.limit,
    "modifiedAfter": payload$?.modifiedAfter,
    "modifiedBefore": payload$?.modifiedBefore,
    "nodeId": payload$?.nodeId,
    "nodeTypes": payload$?.nodeTypes,
    "page": payload$?.page,
  });

  const headers$ = new Headers(compactMap({
    Accept: "application/json",
  }));
  const securityInput = await extractSecurity(client$._options.security);
  const requestSecurity = resolveGlobalSecurity(securityInput);

  const context = {
    options: client$._options,
    baseURL: options?.serverURL ?? client$._baseURL ?? "",
    operationID: "navigateKnowledgeGraph",
    oAuth2Scopes: ["kb:read", "connector:read"],
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
    query: query$,
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
