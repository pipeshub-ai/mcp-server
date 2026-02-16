import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const QueryServiceHealthOpServerList: readonly ["http://localhost:8000"];
export declare const StatusFail: {
    readonly Fail: "fail";
};
export type StatusFail = ClosedEnum<typeof StatusFail>;
export declare const StatusFail$zodSchema: z.ZodEnum<{
    fail: "fail";
}>;
/**
 * Service is unhealthy or dependency check failed
 */
export type QueryServiceHealthInternalServerErrorResponseBody = {
    status?: StatusFail | undefined;
    error?: string | undefined;
    timestamp?: number | undefined;
};
export declare const QueryServiceHealthInternalServerErrorResponseBody$zodSchema: z.ZodType<QueryServiceHealthInternalServerErrorResponseBody>;
export declare const QueryServiceHealthStatusHealthy: {
    readonly Healthy: "healthy";
};
export type QueryServiceHealthStatusHealthy = ClosedEnum<typeof QueryServiceHealthStatusHealthy>;
export declare const QueryServiceHealthStatusHealthy$zodSchema: z.ZodEnum<{
    healthy: "healthy";
}>;
/**
 * Service is healthy
 */
export type QueryServiceHealthResponseBodyHealthy = {
    status?: QueryServiceHealthStatusHealthy | undefined;
    timestamp?: number | undefined;
};
export declare const QueryServiceHealthResponseBodyHealthy$zodSchema: z.ZodType<QueryServiceHealthResponseBodyHealthy>;
export type QueryServiceHealthResponse = QueryServiceHealthResponseBodyHealthy | QueryServiceHealthInternalServerErrorResponseBody;
export declare const QueryServiceHealthResponse$zodSchema: z.ZodType<QueryServiceHealthResponse>;
//# sourceMappingURL=queryservicehealthop.d.ts.map