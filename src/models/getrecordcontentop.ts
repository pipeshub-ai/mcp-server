import * as z from "zod";

export type GetRecordContentRequest = {
  recordId: string;
  mode?: "record" | "thread" | undefined;
  query?: string | undefined;
  startBlock?: number | undefined;
  startRecord?: number | undefined;
  maxChars?: number | undefined;
};

// Bounds match the server (`connectors.routes.ts` and the query service's
// `/records/{record_id}/read`), so an out-of-range value is a validation
// message here instead of a 400 round-trip. Any of the optional fields asks
// for a budgeted read; with none, the server returns the whole record.
export const GetRecordContentRequest$zodSchema: z.ZodType<
  GetRecordContentRequest
> = z.object({
  recordId: z.string().describe(
    "Record ID to fetch. Obtain it from a `pipeshub_search` result (`hits[*].recordId`) or a chat citation (`citations[*].recordId`).",
  ),
  mode: z.enum(["record", "thread"]).optional(),
  query: z.string().min(1).max(2000).optional(),
  startBlock: z.int().min(0).optional(),
  startRecord: z.int().min(0).optional(),
  maxChars: z.int().min(2000).max(140000).optional(),
});
