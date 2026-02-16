import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const ConnectorServiceHealthOpServerList: readonly ["http://localhost:8088"];
export declare const ConnectorServiceHealthStatus: {
    readonly Healthy: "healthy";
};
export type ConnectorServiceHealthStatus = ClosedEnum<typeof ConnectorServiceHealthStatus>;
export declare const ConnectorServiceHealthStatus$zodSchema: z.ZodEnum<{
    healthy: "healthy";
}>;
/**
 * Service is healthy
 */
export type ConnectorServiceHealthResponse = {
    status?: ConnectorServiceHealthStatus | undefined;
    timestamp?: number | undefined;
};
export declare const ConnectorServiceHealthResponse$zodSchema: z.ZodType<ConnectorServiceHealthResponse>;
//# sourceMappingURL=connectorservicehealthop.d.ts.map