import * as z from "zod";
/**
 * Request payload
 */
export type SetMetricsPushIntervalRequest = {
    pushIntervalMs: number;
};
export declare const SetMetricsPushIntervalRequest$zodSchema: z.ZodType<SetMetricsPushIntervalRequest>;
/**
 * Push interval updated successfully
 */
export type SetMetricsPushIntervalResponse = {
    message?: string | undefined;
};
export declare const SetMetricsPushIntervalResponse$zodSchema: z.ZodType<SetMetricsPushIntervalResponse>;
//# sourceMappingURL=setmetricspushintervalop.d.ts.map