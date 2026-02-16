import * as z from "zod";
export type ResumeCrawlingJobRequest = {
    connector: string;
    connectorId: string;
};
export declare const ResumeCrawlingJobRequest$zodSchema: z.ZodType<ResumeCrawlingJobRequest>;
export type ResumeCrawlingJobData = {
    connector?: string | undefined;
    orgId?: string | undefined;
    resumedAt?: string | undefined;
};
export declare const ResumeCrawlingJobData$zodSchema: z.ZodType<ResumeCrawlingJobData>;
/**
 * Crawling job resumed successfully
 */
export type ResumeCrawlingJobResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: ResumeCrawlingJobData | undefined;
};
export declare const ResumeCrawlingJobResponse$zodSchema: z.ZodType<ResumeCrawlingJobResponse>;
//# sourceMappingURL=resumecrawlingjobop.d.ts.map