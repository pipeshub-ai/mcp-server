import * as z from "zod";
import { JobStatus } from "./jobstatus.js";
/**
 * All job statuses retrieved successfully
 */
export type GetAllCrawlingJobStatusResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Array<JobStatus> | undefined;
};
export declare const GetAllCrawlingJobStatusResponse$zodSchema: z.ZodType<GetAllCrawlingJobStatusResponse>;
//# sourceMappingURL=getallcrawlingjobstatusop.d.ts.map