import * as z from "zod";
import { JobStatus } from "./jobstatus.js";
export type GetCrawlingJobStatusRequest = {
    connector: string;
    connectorId: string;
};
export declare const GetCrawlingJobStatusRequest$zodSchema: z.ZodType<GetCrawlingJobStatusRequest>;
/**
 * Job status retrieved successfully
 */
export type GetCrawlingJobStatusResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: JobStatus | undefined;
};
export declare const GetCrawlingJobStatusResponse$zodSchema: z.ZodType<GetCrawlingJobStatusResponse>;
//# sourceMappingURL=getcrawlingjobstatusop.d.ts.map