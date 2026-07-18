import * as z from "zod";

export type GetRecordContentRequest = { recordId: string };

export const GetRecordContentRequest$zodSchema: z.ZodType<
  GetRecordContentRequest
> = z.object({
  recordId: z.string().describe(
    "Record ID to fetch. Obtain it from a `pipeshub_search` result (`hits[*].recordId`) or a chat citation (`citations[*].recordId`).",
  ),
});
