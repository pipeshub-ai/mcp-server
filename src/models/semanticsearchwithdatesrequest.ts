/*
 * Hand-written: the generated SemanticSearchRequest plus the search API's
 * optional date bounds. The generated schema strips keys it does not know,
 * so the bounds cannot ride on it.
 */

import * as z from "zod";
import { SemanticSearchFilters$zodSchema } from "./semanticsearchfilters.js";
import { SemanticSearchRequest } from "./semanticsearchrequest.js";

/**
 * Bounds on the source's own created / last-updated date. Each is
 * `YYYY-MM-DD` (that whole day, UTC) or an ISO 8601 datetime with a timezone
 * offset; both ends are inclusive. The server parses them and answers `400`
 * with the reason when one is not a date it accepts.
 */
export type SemanticSearchDateBounds = {
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
  modifiedAfter?: string | undefined;
  modifiedBefore?: string | undefined;
};

export type SemanticSearchWithDatesRequest =
  & SemanticSearchRequest
  & SemanticSearchDateBounds
  & {
    /**
     * `false` searches the query exactly as sent: the server skips its model
     * rewrite and expanded variants. Left out, the server rewrites and
     * expands. A server older than the option ignores it.
     */
    rewriteQuery?: boolean | undefined;
    /**
     * Set, the server searches the span of the matching date bounds period
     * by period and returns the matches in date order, each hit with its
     * `timelinePeriod`. The value is the date records are placed by. A
     * server older than the option ignores it and sends no `timeline`.
     * `"off"` asks a server that would otherwise search a long range period
     * by period for one ranked search; a server without that refuses it.
     */
    timeline?: "created" | "modified" | "off" | undefined;
  };

export const SemanticSearchWithDatesRequest$zodSchema: z.ZodType<
  SemanticSearchWithDatesRequest
> = z.object({
  chatMode: z.string().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  filters: SemanticSearchFilters$zodSchema.optional(),
  limit: z.int().default(10),
  modelFriendlyName: z.string().optional(),
  modelKey: z.string().optional(),
  modelName: z.string().optional(),
  query: z.string(),
  modifiedAfter: z.string().optional(),
  modifiedBefore: z.string().optional(),
  rewriteQuery: z.boolean().optional(),
  timeline: z.enum(["created", "modified", "off"]).optional(),
});
