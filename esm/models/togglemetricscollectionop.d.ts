import * as z from "zod";
/**
 * Request payload
 */
export type ToggleMetricsCollectionRequest = {
    enableMetricCollection: boolean;
};
export declare const ToggleMetricsCollectionRequest$zodSchema: z.ZodType<ToggleMetricsCollectionRequest>;
/**
 * Metrics collection toggled successfully
 */
export type ToggleMetricsCollectionResponse = {
    message?: string | undefined;
};
export declare const ToggleMetricsCollectionResponse$zodSchema: z.ZodType<ToggleMetricsCollectionResponse>;
//# sourceMappingURL=togglemetricscollectionop.d.ts.map