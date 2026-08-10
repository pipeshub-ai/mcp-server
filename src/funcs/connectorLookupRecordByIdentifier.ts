/*
 * Adapted from Speakeasy-generated connectorLookupRecordByIdentifier.
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
  LookupRecordByIdentifierRequest,
  LookupRecordByIdentifierRequest$zodSchema,
} from "../models/lookuprecordbyidentifierop.js";
import { APICall, APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";

/**
 * Resolve a URL, issue key or external ID to a Record ID
 *
 * @remarks
 * Turn an external reference into the matching PipesHub record. Accepts a
 * pasted link, a Jira-style issue key, or a bare external system ID from
 * any connected source. Repeat `identifiers` to batch-resolve up to ten
 * in one call.
 *
 * The response carries a rendered `text` view — each match's metadata
 * block followed by a `Next:` line naming a follow-up call. The structured
 * fields carry the same information for programmatic use.
 *
 * **Accepted identifiers**
 * - Jira issue URL — `https://acme.atlassian.net/browse/PA-1787`
 * - Jira issue key — `PA-1787`
 * - Confluence page URL —
 *   `https://acme.atlassian.net/wiki/spaces/SD/pages/450625553/Agent+Loop`
 * - Google Drive / Docs URL — `https://docs.google.com/document/d/1AbC.../edit`
 * - Slack message link — `https://acme.slack.com/archives/C0123/p1720000000000100`
 * - Bare external system ID — `450625553`
 *
 * **When to use this vs. the other record endpoints:**
 * - **This endpoint** converts an *external* reference into an internal
 *   Record ID. Reach for it whenever you meet a link or ticket key and
 *   need the record behind it.
 * - `GET /connectors/record/{recordId}/content` reads a record you have
 *   already identified. It needs an internal Record ID, which is exactly
 *   what this endpoint returns.
 * - `GET /connectors/navigate` browses the hierarchy when you have a
 *   position in the tree rather than a specific identifier.
 *
 * **Typical flow:** call this with the reference, take a match's `id`
 * from the response, then call
 * `GET /connectors/record/{recordId}/content` to read the record.
 *
 * **Multiple matches:** one identifier can legitimately match more than
 * one record — the same external ID may exist in several connected
 * instances. In that case the response sets `ambiguous: true` and
 * `matches` holds every candidate. Present the choice rather than taking
 * the first; `connectorName` narrows a retry.
 *
 * **Misses are not errors.**
 *
 * Only records the caller can see are returned, and a miss is a `200`
 * with an empty `matches` array and the input echoed in
 * `not_found_identifiers` — not a `404`. The identifier resolved to
 * nothing *or* to something the caller may not access; the two are
 * deliberately indistinguishable, because an identifier is
 * caller-supplied and guessable, and confirming existence would leak
 * records across organizations. `searched_connectors` names what was
 * covered, so a retry with `connectorName` is often the right next move.
 *
 * **Scope:** resolution searches every connector the caller can access,
 * regardless of any source filter used elsewhere.
 *
 * If set, this operation will use either {@link Security.bearerAuth} or {@link Security.oauth2} from the global security.
 */
export function connectorLookupRecordByIdentifier(
  client$: PipeshubCore,
  request: LookupRecordByIdentifierRequest,
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
  request: LookupRecordByIdentifierRequest,
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
    (value$) => LookupRecordByIdentifierRequest$zodSchema.parse(value$),
    "Input validation failed",
  );
  if (!parsed$.ok) {
    return [parsed$, { status: "invalid" }];
  }
  const payload$ = parsed$.value;
  const body$ = null;
  const path$ = pathToFunc("/connectors/record/lookup")();
  const query$ = encodeFormQuery({
    "connectorName": payload$.connectorName,
    "identifiers": payload$.identifiers,
  });

  const headers$ = new Headers(compactMap({
    Accept: "application/json",
  }));
  const securityInput = await extractSecurity(client$._options.security);
  const requestSecurity = resolveGlobalSecurity(securityInput);

  const context = {
    options: client$._options,
    baseURL: options?.serverURL ?? client$._baseURL ?? "",
    operationID: "lookupRecordByIdentifier",
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
