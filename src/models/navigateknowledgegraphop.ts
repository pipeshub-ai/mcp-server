/*
 * Adapted from Speakeasy-generated navigateknowledgegraphop.
 *
 * Request only. The generated file also declared a `NavigateKnowledgeGraphResponse`
 * union, which pulls in ~10 further response models; the func returns a raw
 * `Response` (errorCodes: []) and the tool parses it with `readJson`, so none of
 * that is used here.
 */

import * as z from "zod";

export type NavigateKnowledgeGraphRequest = {
  nodeId?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  depth?: number | undefined;
  nodeTypes?: Array<string> | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
  modifiedAfter?: string | undefined;
  modifiedBefore?: string | undefined;
};

// Bounds come from the OpenAPI spec rather than the generated schema, which
// dropped them: the endpoint 400s on `limit` outside 50-200, `depth` outside
// 1-3, `page` below 1, or an empty `nodeId`. Rejecting client-side turns each
// of those into a validation message instead of a round-trip.
export const NavigateKnowledgeGraphRequest$zodSchema: z.ZodType<
  NavigateKnowledgeGraphRequest
> = z.object({
  createdAfter: z.string().describe(
    "Filter children by source creation time. ISO 8601 `YYYY-MM-DD`, or a full datetime that MUST carry a timezone offset — a naive datetime is rejected rather than assumed to be UTC.",
  ).optional(),
  createdBefore: z.string().describe(
    "Filter children by source creation time. `YYYY-MM-DD` is inclusive of the whole day.",
  ).optional(),
  depth: z.int().min(1).max(3).default(1).describe(
    "Levels of descendants to return in one call. Above 1, `rows` is a flat list of all descendants down to that level rather than only direct children, and each row carries its own `level`.",
  ),
  limit: z.int().min(50).max(200).default(50).describe(
    "Children per page. The minimum is 50 — smaller values are rejected rather than silently raised.",
  ),
  modifiedAfter: z.string().describe(
    "Filter children by source modification time.",
  ).optional(),
  modifiedBefore: z.string().describe(
    "Filter children by source modification time.",
  ).optional(),
  nodeId: z.string().min(1).max(2048).describe(
    "The node to open. Take it from an `id` in a previous navigate or lookup response. Omit it entirely for the flat listing of everything reachable — the usual starting point. A URL or an issue key such as `PA-1787` also works: it is resolved to its record automatically.",
  ).optional(),
  nodeTypes: z.array(z.string()).describe(
    "Restrict children to these node types. Repeat the parameter for multiple types: `?nodeTypes=record&nodeTypes=folder`.",
  ).optional(),
  page: z.int().min(1).default(1).describe("Page number, 1-indexed."),
});
