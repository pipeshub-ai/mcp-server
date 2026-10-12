import * as z from "zod";

export type GetConnectorStatsRequest = { connectorId: string };

export const GetConnectorStatsRequest$zodSchema: z.ZodType<
  GetConnectorStatsRequest
> = z.object({
  connectorId: z.string().min(1).describe(
    "Connector or collection id, as `pipeshub_sources` lists it.",
  ),
});
