import * as z from "zod";
import { QueueStats } from "./queuestats.js";
/**
 * Queue statistics retrieved successfully
 */
export type GetQueueStatsResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: QueueStats | undefined;
};
export declare const GetQueueStatsResponse$zodSchema: z.ZodType<GetQueueStatsResponse>;
//# sourceMappingURL=getqueuestatsop.d.ts.map