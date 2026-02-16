import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const DoclingServiceHealthOpServerList: readonly ["http://localhost:8081"];
export declare const DoclingServiceHealthStatus: {
    readonly Healthy: "healthy";
};
export type DoclingServiceHealthStatus = ClosedEnum<typeof DoclingServiceHealthStatus>;
export declare const DoclingServiceHealthStatus$zodSchema: z.ZodEnum<{
    healthy: "healthy";
}>;
/**
 * Service is healthy
 */
export type DoclingServiceHealthResponse = {
    status?: DoclingServiceHealthStatus | undefined;
    service?: string | undefined;
};
export declare const DoclingServiceHealthResponse$zodSchema: z.ZodType<DoclingServiceHealthResponse>;
//# sourceMappingURL=doclingservicehealthop.d.ts.map