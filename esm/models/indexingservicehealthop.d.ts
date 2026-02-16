import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const IndexingServiceHealthOpServerList: readonly ["http://localhost:8091"];
export declare const IndexingServiceHealthStatus: {
    readonly Healthy: "healthy";
};
export type IndexingServiceHealthStatus = ClosedEnum<typeof IndexingServiceHealthStatus>;
export declare const IndexingServiceHealthStatus$zodSchema: z.ZodEnum<{
    healthy: "healthy";
}>;
/**
 * Service is healthy
 */
export type IndexingServiceHealthResponse = {
    status?: IndexingServiceHealthStatus | undefined;
    timestamp?: number | undefined;
};
export declare const IndexingServiceHealthResponse$zodSchema: z.ZodType<IndexingServiceHealthResponse>;
//# sourceMappingURL=indexingservicehealthop.d.ts.map