import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const QueryServiceHealthCheckOpServerList: readonly ["http://localhost:8000"];
export type QueryServiceHealthCheckSecurity = {
    scopedToken: string;
};
export declare const QueryServiceHealthCheckSecurity$zodSchema: z.ZodType<QueryServiceHealthCheckSecurity>;
/**
 * Type of model to health check
 */
export declare const QueryServiceHealthCheckModelType: {
    readonly Llm: "llm";
    readonly Embedding: "embedding";
};
/**
 * Type of model to health check
 */
export type QueryServiceHealthCheckModelType = ClosedEnum<typeof QueryServiceHealthCheckModelType>;
export declare const QueryServiceHealthCheckModelType$zodSchema: z.ZodEnum<{
    embedding: "embedding";
    llm: "llm";
}>;
export type QueryServiceHealthCheckConfiguration = {
    model?: string | undefined;
    apiKey?: string | undefined;
};
export declare const QueryServiceHealthCheckConfiguration$zodSchema: z.ZodType<QueryServiceHealthCheckConfiguration>;
/**
 * Request payload
 */
export type QueryServiceHealthCheckRequestBody = {
    provider: string;
    configuration: QueryServiceHealthCheckConfiguration;
    isMultimodal?: boolean | undefined;
};
export declare const QueryServiceHealthCheckRequestBody$zodSchema: z.ZodType<QueryServiceHealthCheckRequestBody>;
export type QueryServiceHealthCheckRequest = {
    model_type: QueryServiceHealthCheckModelType;
    body: QueryServiceHealthCheckRequestBody;
};
export declare const QueryServiceHealthCheckRequest$zodSchema: z.ZodType<QueryServiceHealthCheckRequest>;
export declare const QueryServiceHealthCheckInternalServerErrorStatus: {
    readonly Error: "error";
    readonly NotHealthy: "not healthy";
};
export type QueryServiceHealthCheckInternalServerErrorStatus = ClosedEnum<typeof QueryServiceHealthCheckInternalServerErrorStatus>;
export declare const QueryServiceHealthCheckInternalServerErrorStatus$zodSchema: z.ZodEnum<{
    error: "error";
    "not healthy": "not healthy";
}>;
export type Details = {};
export declare const Details$zodSchema: z.ZodType<Details>;
/**
 * Model health check failed
 */
export type QueryServiceHealthCheckInternalServerErrorResponseBody = {
    status?: QueryServiceHealthCheckInternalServerErrorStatus | undefined;
    message?: string | undefined;
    details?: Details | undefined;
};
export declare const QueryServiceHealthCheckInternalServerErrorResponseBody$zodSchema: z.ZodType<QueryServiceHealthCheckInternalServerErrorResponseBody>;
export declare const QueryServiceHealthCheckStatusHealthy: {
    readonly Healthy: "healthy";
};
export type QueryServiceHealthCheckStatusHealthy = ClosedEnum<typeof QueryServiceHealthCheckStatusHealthy>;
export declare const QueryServiceHealthCheckStatusHealthy$zodSchema: z.ZodEnum<{
    healthy: "healthy";
}>;
/**
 * Model is healthy
 */
export type QueryServiceHealthCheckResponseBodyHealthy = {
    status?: QueryServiceHealthCheckStatusHealthy | undefined;
    message?: string | undefined;
    timestamp?: number | undefined;
};
export declare const QueryServiceHealthCheckResponseBodyHealthy$zodSchema: z.ZodType<QueryServiceHealthCheckResponseBodyHealthy>;
export type QueryServiceHealthCheckResponse = QueryServiceHealthCheckResponseBodyHealthy | QueryServiceHealthCheckInternalServerErrorResponseBody;
export declare const QueryServiceHealthCheckResponse$zodSchema: z.ZodType<QueryServiceHealthCheckResponse>;
//# sourceMappingURL=queryservicehealthcheckop.d.ts.map