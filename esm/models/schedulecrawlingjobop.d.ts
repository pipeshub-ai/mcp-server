import * as z from "zod";
import { ScheduleConfig } from "./scheduleconfig.js";
/**
 * Request payload
 */
export type ScheduleCrawlingJobRequestBody = {
    scheduleConfig: ScheduleConfig;
    priority?: number | undefined;
    maxRetries?: number | undefined;
    timeout?: number | undefined;
};
export declare const ScheduleCrawlingJobRequestBody$zodSchema: z.ZodType<ScheduleCrawlingJobRequestBody>;
export type ScheduleCrawlingJobRequest = {
    connector: string;
    connectorId: string;
    body: ScheduleCrawlingJobRequestBody;
};
export declare const ScheduleCrawlingJobRequest$zodSchema: z.ZodType<ScheduleCrawlingJobRequest>;
export type ScheduleCrawlingJobData = {
    jobId?: string | undefined;
    connector?: string | undefined;
    connectorId?: string | undefined;
    scheduleConfig?: ScheduleConfig | undefined;
    scheduledAt?: string | undefined;
};
export declare const ScheduleCrawlingJobData$zodSchema: z.ZodType<ScheduleCrawlingJobData>;
/**
 * Crawling job scheduled successfully
 */
export type ScheduleCrawlingJobResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: ScheduleCrawlingJobData | undefined;
};
export declare const ScheduleCrawlingJobResponse$zodSchema: z.ZodType<ScheduleCrawlingJobResponse>;
//# sourceMappingURL=schedulecrawlingjobop.d.ts.map