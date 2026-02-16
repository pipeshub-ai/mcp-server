import * as z from "zod";
import { ScheduleConfig } from "./scheduleconfig.js";
/**
 * Data payload stored with each crawling job in the queue
 */
export type CrawlingJobData = {
    connector: string;
    connectorId: string;
    scheduleConfig: ScheduleConfig;
    orgId: string;
    userId: string;
    timestamp: string;
    metadata?: {
        [k: string]: any;
    } | undefined;
};
export declare const CrawlingJobData$zodSchema: z.ZodType<CrawlingJobData>;
//# sourceMappingURL=crawlingjobdata.d.ts.map