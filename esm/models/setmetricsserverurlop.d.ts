import * as z from "zod";
/**
 * Request payload
 */
export type SetMetricsServerUrlRequest = {
    serverUrl: string;
};
export declare const SetMetricsServerUrlRequest$zodSchema: z.ZodType<SetMetricsServerUrlRequest>;
/**
 * Server URL updated successfully
 */
export type SetMetricsServerUrlResponse = {
    message?: string | undefined;
};
export declare const SetMetricsServerUrlResponse$zodSchema: z.ZodType<SetMetricsServerUrlResponse>;
//# sourceMappingURL=setmetricsserverurlop.d.ts.map