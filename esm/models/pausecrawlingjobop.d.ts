import * as z from "zod";
export type PauseCrawlingJobRequest = {
    connector: string;
    connectorId: string;
};
export declare const PauseCrawlingJobRequest$zodSchema: z.ZodType<PauseCrawlingJobRequest>;
export type PauseCrawlingJobData = {
    connector?: string | undefined;
    orgId?: string | undefined;
    pausedAt?: string | undefined;
};
export declare const PauseCrawlingJobData$zodSchema: z.ZodType<PauseCrawlingJobData>;
/**
 * Crawling job paused successfully
 */
export type PauseCrawlingJobResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: PauseCrawlingJobData | undefined;
};
export declare const PauseCrawlingJobResponse$zodSchema: z.ZodType<PauseCrawlingJobResponse>;
//# sourceMappingURL=pausecrawlingjobop.d.ts.map