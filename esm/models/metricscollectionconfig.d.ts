import * as z from "zod";
/**
 * Configuration for application telemetry and metrics collection.
 *
 * @remarks
 * Metrics are collected anonymously and pushed to a remote server for analytics.
 */
export type MetricsCollectionConfig = {
    enableMetricCollection?: boolean | undefined;
    pushIntervalMs?: number | undefined;
    serverUrl?: string | undefined;
    apiKey?: string | undefined;
    instanceId?: string | undefined;
    appVersion?: string | undefined;
};
export declare const MetricsCollectionConfig$zodSchema: z.ZodType<MetricsCollectionConfig>;
//# sourceMappingURL=metricscollectionconfig.d.ts.map